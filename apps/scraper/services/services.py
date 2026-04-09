import logging
import os
import random
import time
import re
from decimal import Decimal
from typing import Dict, Optional, Any, List
from urllib.parse import quote_plus

import requests
from bs4 import BeautifulSoup
from difflib import SequenceMatcher
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from concurrent.futures import ThreadPoolExecutor, as_completed
from apps.scraper.models import Product, StorePrice, PriceHistory

SERPAPI_ENDPOINT = "https://serpapi.com/search.json"

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
]


class ScraperService:
    """Generic scraper that can search Amazon/Flipkart and persist prices."""

    def __init__(self) -> None:
        # last_error is used by callers to understand why scraping returned no results
        self.last_error: Optional[str] = None

    def search_all(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Aggregate search that executes multiple providers (SerpAPI, Amazon, Flipkart)
        in parallel to ensure a wide price comparison matrix while minimizing latency.
        """
        self.last_error = ""
        results = []
        
        # Parallel execution of scrapers
        scrapers = [
            (self._serp_scrape, (query, limit)),
            (self.search_amazon, (query, limit // 2)),
            (self.search_flipkart, (query, limit // 2)),
        ]
        
        with ThreadPoolExecutor(max_workers=3) as executor:
            future_to_scraper = {executor.submit(func, *args): func.__name__ for func, args in scrapers}
            try:
                for future in as_completed(future_to_scraper, timeout=12):
                    name = future_to_scraper[future]
                    try:
                        res = future.result()
                        if res:
                            results.extend(res)
                    except Exception as e:
                        logger.warning(f"Scraper {name} failed: {e}")
            except Exception as e:
                # Handle TimeoutError or other iteration errors
                logger.warning(f"Parallel scraping partial completion: {e}")
        
        return results
    def _serp_scrape(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Fetch results from SerpAPI Google Shopping and normalize them."""
        self.last_error = None
        SERPAPI_API_KEY = getattr(settings, 'SERPAPI_API_KEY', '') or os.getenv('SERPAPI_API_KEY', '')
        if not SERPAPI_API_KEY:
            self.last_error = 'Missing SERPAPI_API_KEY'
            logger.error(self.last_error)
            return []

        def _call_serp(q: str) -> Optional[dict]:
            params = {
                'engine': 'google_shopping',
                'q': q,
                'api_key': SERPAPI_API_KEY,
                'hl': 'en',
                'gl': 'in',
                'num': 20,
            }
            try:
                resp = requests.get(SERPAPI_ENDPOINT, params=params, timeout=20)
                resp.raise_for_status()
                data = resp.json()
                logger.info('SERPAPI RAW COUNT %s', len(data.get('shopping_results', [])))
                return data
            except Exception as exc:
                self.last_error = f'SerpAPI error: {exc}'
                logger.exception('SerpAPI request failed')
                return None

        # Direct attempt only for parallel efficiency
        data = _call_serp(query)

        if not data or not data.get('shopping_results'):
            self.last_error = 'SerpAPI returned no shopping results after retries'
            return []

        normalized: List[Dict[str, Any]] = []
        for item in data.get('shopping_results', []):
            if len(normalized) >= limit:
                break
            title = item.get('title') or item.get('name')
            raw_price = item.get('price') or item.get('extracted_price') or item.get('converted_price')
            if not raw_price:
                # skip items without price
                continue
            price = None
            try:
                cleaned = re.sub(r'[^0-9.]', '', str(raw_price))
                if cleaned:
                    from decimal import Decimal
                    price = Decimal(cleaned)
            except Exception:
                price = None
            if price is None:
                continue

            store = item.get('source') or item.get('merchant') or item.get('store')
            link = item.get('product_link') or item.get('link') or item.get('url')
            if not (title and store and link):
                continue
            normalized.append({
                'store': store,
                'name': title,
                'price': price,
                'url': link,
                'provider': 'SerpAPI',
                'rating': item.get('rating'),
                'reviews': item.get('reviews'),
                'thumbnail': item.get('thumbnail'),
            })

        logger.info('SERPAPI RESULT COUNT %d for query %s', len(normalized), query)
        if not normalized:
            self.last_error = 'SerpAPI returned zero normalized items after filtering'
        return normalized

    # --- HTTP helpers ---
    def _fetch(self, url: str) -> Optional[str]:
        headers = {"User-Agent": random.choice(USER_AGENTS)}
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            if resp.status_code != 200:
                logger.warning("fetch non-200 %s %s", resp.status_code, url)
                return None
            if "captcha" in resp.text.lower() or "robot" in resp.text.lower():
                return None
            return resp.text
        except Exception as exc:
            logger.warning("fetch error %s", exc)
            return None

    def _fetch_selenium(self, url: str) -> Optional[str]:
        try:
            from apps.scraper.stealth_browser import SeleniumStealthDriver
            from apps.scraper.stealth_browser import HumanBehavior
        except Exception as exc:
            logger.warning("selenium import failed %s", exc)
            return None
            
        driver = None
        try:
            driver = SeleniumStealthDriver.get_driver(headless=True)
            driver.get(url)
            HumanBehavior.smart_delay(1.5, 3.5)
            
            # Simple human scroll
            HumanBehavior.random_scroll(driver)
            
            source = driver.page_source
            return source
        except Exception as exc:
            logger.warning("selenium fetch failed %s", exc)
            return None
        finally:
            if driver:
                SeleniumStealthDriver.close_driver(driver)

    # --- Parsing helpers ---
    def _parse_price(self, text: str) -> Optional[Decimal]:
        if not text:
            return None
        cleaned = re.sub(r"[^0-9.]", "", text)
        try:
            return Decimal(cleaned)
        except Exception:
            return None

    def _best(self, *values):
        for v in values:
            if v:
                return v
        return None

    def search_amazon(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        url = f"https://www.amazon.in/s?k={quote_plus(query)}"
        html = self._fetch(url) or self._fetch_selenium(url)
        if not html:
            self.last_error = "Scraping blocked or no results"
            return []
        soup = BeautifulSoup(html, "html.parser")
        time.sleep(random.uniform(0.4, 1.1))
        cards = soup.select("div.s-result-item[data-component-type='s-search-result']")
        results: List[Dict[str, Any]] = []
        for card in cards[:limit]:
            title_el = card.select_one("h2 a span") or card.select_one("span.a-size-medium.a-color-base.a-text-normal")
            price_el = card.select_one("span.a-price span.a-offscreen") or card.select_one("span.a-price-whole")
            rating_el = card.select_one("span.a-icon-alt")
            link_el = card.select_one("h2 a")
            name = title_el.text.strip() if title_el else None
            price = self._parse_price(price_el.text) if price_el else None
            rating = rating_el.text.strip() if rating_el else None
            href = link_el.get("href") if link_el else None
            if not name or not href:
                continue
            full_url = href if href.startswith("http") else f"https://www.amazon.in{href}"
            results.append({
                "store": "Amazon",
                "name": name,
                "price": price,
                "rating": rating,
                "url": full_url,
            })
        return results

    def search_flipkart(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        url = f"https://www.flipkart.com/search?q={quote_plus(query)}"
        html = self._fetch(url) or self._fetch_selenium(url)
        if not html:
            self.last_error = "Scraping blocked or no results"
            return []
        soup = BeautifulSoup(html, "html.parser")
        time.sleep(random.uniform(0.4, 1.1))
        cards = soup.select("a._1fQZEK") or soup.select("a.s1Q9rs")
        results: List[Dict[str, Any]] = []
        for card in cards[:limit]:
            title_el = card.select_one("div._4rR01T") or card.select_one("div.KzDlHZ") or card
            price_el = card.select_one("div._30jeq3._1_WHN1") or card.select_one("div._30jeq3")
            rating_el = card.select_one("div._3LWZlK")
            name = title_el.text.strip() if title_el else None
            price = self._parse_price(price_el.text) if price_el else None
            rating = rating_el.text.strip() if rating_el else None
            href = card.get("href") if card else None
            if not name or not href:
                continue
            full_url = href if href.startswith("http") else f"https://www.flipkart.com{href}"
            results.append({
                "store": "Flipkart",
                "name": name,
                "price": price,
                "rating": rating,
                "url": full_url,
            })
        return results

    # --- Persistence and fuzzy matching ---
    def _fuzzy_match_product(self, clean_query: str) -> Optional[Product]:
        try:
            from django.contrib.postgres.search import TrigramSimilarity
            qs = (
                Product.objects.annotate(similarity=TrigramSimilarity('name', clean_query))
                .filter(similarity__gte=0.3)
                .order_by('-similarity')
            )
            candidate = qs.first()
            if candidate and candidate.similarity >= 0.85:
                query_nums = set(re.findall(r'\b\d+\b', clean_query))
                prod_nums = set(re.findall(r'\b\d+\b', candidate.name))
                if query_nums == prod_nums or not query_nums or not prod_nums:
                    return candidate
        except Exception:
            pass

        # fallback manual
        best = None
        best_score = 0.0
        query_nums = set(re.findall(r'\b\d+\b', clean_query))
        
        for prod in Product.objects.order_by('-updated_at')[:50]:
            score = SequenceMatcher(None, prod.name.lower(), clean_query.lower()).ratio()
            prod_nums = set(re.findall(r'\b\d+\b', prod.name))
            nums_match = query_nums == prod_nums or not query_nums or not prod_nums
            
            if score > best_score and nums_match:
                best_score = score
                best = prod
                
        if best_score >= 0.85:
            return best
        return None

    def persist_results(self, clean_query: str, raw_query: str, results: List[Dict[str, Any]]):
        if not results:
            return {'product': None, 'rows': []}

        # Fuzzy group similar items across stores
        grouped_results = []
        for res in results:
            name = res.get('name')
            if not name:
                continue
            
            matched_group = None
            for group in grouped_results:
                group_name = group[0].get('name')
                similarity = SequenceMatcher(None, name.lower(), group_name.lower()).ratio()
                
                # Check if the primary model number matches (usually the first number in the string)
                name_nums = re.findall(r'\d+', name)
                group_nums = re.findall(r'\d+', group_name)
                
                nums_match = False
                if name_nums and group_nums:
                    nums_match = (name_nums[0] == group_nums[0])
                else:
                    nums_match = (not name_nums and not group_nums)
                    
                # Check if brand roughly matches by looking at first word
                name_brand = name.split()[0].lower() if name else ""
                group_brand = group_name.split()[0].lower() if group_name else ""
                brand_match = (name_brand == group_brand)
                
                # Loose text matching if the model number and brand match perfectly, otherwise require high similarity
                if (similarity >= 0.55 and nums_match and brand_match) or similarity >= 0.85:
                    matched_group = group
                    break
            
            if matched_group is not None:
                matched_group.append(res)
            else:
                grouped_results.append([res])

        rows = []
        first_product = None

        with transaction.atomic():
            for group in grouped_results:
                # Use shortest name in group as canonical
                canonical_name = min((r.get('name') for r in group), key=len)
                
                product = self._fuzzy_match_product(canonical_name)
                if not product:
                    product = Product.objects.create(name=canonical_name)

                if first_product is None:
                    first_product = product

                for res in group:
                    store = res.get('store') or 'Amazon'
                    price_val = res.get('price') or Decimal('0')
                    url = res.get('url') or ''
                    defaults = {
                        'current_price': price_val,
                        'product_url': url,
                        'image_url': res.get('image_url') or res.get('image') or res.get('thumbnail') or '',
                        'is_available': True,
                        'metadata': {
                            'rating': res.get('rating'),
                            'reviews': res.get('reviews'),
                        },
                    }
                    sp, created = StorePrice.objects.update_or_create(
                        product=product,
                        store_name=store,
                        defaults=defaults,
                    )

                    # price history with simple delta
                    PriceHistory.objects.create(
                        store_price=sp,
                        price=price_val,
                        currency='INR',
                        change_percentage=None,
                    )
                    sp.last_updated = timezone.now()
                    sp.save()

                product.update_lowest_price()

                # build row for this product
                store_prices = list(product.prices.all())
                numeric = [p.current_price for p in store_prices if p.current_price is not None]
                min_val = min(numeric) if numeric else None

                # Determine delta off the first two prices if available for legacy support
                delta_label = 'STABLE_00'
                if len(numeric) >= 2:
                    diff = Decimal(numeric[0]) - Decimal(numeric[1])
                    if diff != 0:
                        prefix = 'DROP' if diff > 0 else 'RISE'
                        magnitude = abs(diff)
                        magnitude_label = f"{magnitude:.0f}"
                        delta_label = f"{prefix}_{magnitude_label}"

                def fmt(value):
                    return f"₹{int(Decimal(value)):,}" if value is not None else 'N/A'

                if not store_prices:
                    rows.append({
                        'id': product.id,
                        'name': product.name.upper()[:40],
                        'store': 'N/A',
                        'price': 'N/A',
                        'min': 'N/A',
                        'delta': 'STABLE_00',
                        'status': product.trend_indicator or 'LIVE',
                        'url': '',
                    })

                for sp in store_prices:
                    sp_meta = sp.metadata if isinstance(sp.metadata, dict) else {}
                    rows.append({
                        'id': product.id,
                        'name': product.name.upper()[:40],
                        'store': sp.store_name.upper(),
                        'price': fmt(sp.current_price),
                        'min': fmt(min_val),
                        'delta': delta_label,
                        'status': product.trend_indicator or 'LIVE',
                        'url': sp.product_url,
                        'rating': sp_meta.get('rating'),
                        'reviews': sp_meta.get('reviews'),
                        'thumbnail': sp.image_url,
                    })

        return {'product': first_product, 'rows': rows}

    # Compatibility wrapper: allow callers to use `scrape()` like other implementations
    def scrape(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        return self.search_all(query, limit)