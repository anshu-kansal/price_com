"""
Product Comparison Intelligence Agent - Core Logic

Implements the 7-step pipeline:
1. Determine input type
2. Extract product identity
3. Build canonical product identity (CPI)
4. Discover same product on other marketplaces
5. Verify product match
6. Extract comparable data
7. Return structured JSON output
"""
import re
import json
import time
import logging
from dataclasses import dataclass, field, asdict
from typing import Optional
from urllib.parse import urlparse, urlencode

import requests
from bs4 import BeautifulSoup
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# DATA STRUCTURES
# ─────────────────────────────────────────────

@dataclass
class CanonicalProductIdentity:
    brand: str = ""
    product_line: str = ""
    model: str = ""
    key_attributes: list = field(default_factory=list)
    category: str = ""


@dataclass
class PlatformResult:
    platform: str = ""
    price: Optional[float] = None
    availability: str = "unavailable"
    seller: str = ""
    rating: Optional[float] = None
    url: str = ""
    match_score: float = 0.0


@dataclass
class ComparisonOutput:
    product_identity: dict = field(default_factory=dict)
    comparisons: list = field(default_factory=list)
    confidence: float = 0.0


# ─────────────────────────────────────────────
# STEP 1: DETERMINE INPUT TYPE
# ─────────────────────────────────────────────

def determine_input_type(user_input: str, has_image: bool = False) -> str:
    """Classify input as product_url, product_image, or product_text."""
    if has_image:
        return "product_image"

    url_pattern = re.compile(
        r'^(https?://)'
        r'(www\.)?(amazon\.|flipkart\.|croma\.|reliancedigital\.|myntra\.|snapdeal\.)'
    )
    if url_pattern.match(user_input.strip()):
        return "product_url"

    # Generic URL check
    parsed = urlparse(user_input.strip())
    if parsed.scheme in ('http', 'https') and parsed.netloc:
        return "product_url"

    return "product_text"


# ─────────────────────────────────────────────
# STEP 2: EXTRACT PRODUCT IDENTITY
# ─────────────────────────────────────────────

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def _safe_get(url: str, timeout: int = 10) -> Optional[BeautifulSoup]:
    """Fetch a URL and return a BeautifulSoup object, or None on failure."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "html.parser")
    except Exception as e:
        logger.warning(f"Failed to fetch {url}: {e}")
        return None


def extract_from_url(url: str) -> dict:
    """Scrape product page and extract identity fields."""
    soup = _safe_get(url)
    if not soup:
        return {}

    domain = urlparse(url).netloc.lower()

    if "amazon" in domain:
        return _extract_amazon(soup, url)
    elif "flipkart" in domain:
        return _extract_flipkart(soup, url)
    elif "croma" in domain:
        return _extract_croma(soup, url)
    else:
        return _extract_generic(soup, url)


def _extract_amazon(soup: BeautifulSoup, url: str) -> dict:
    title = soup.find(id="productTitle")
    title = title.get_text(strip=True) if title else ""

    brand_tag = soup.find(id="bylineInfo") or soup.find("a", id="brand")
    brand = brand_tag.get_text(strip=True).replace("Brand: ", "").replace("Visit the ", "").replace(" Store", "") if brand_tag else ""

    # Price
    price = None
    price_tag = soup.find("span", class_="a-price-whole")
    if price_tag:
        price_str = price_tag.get_text(strip=True).replace(",", "").replace(".", "")
        try:
            price = float(price_str)
        except ValueError:
            pass

    # Rating
    rating = None
    rating_tag = soup.find("span", class_="a-icon-alt")
    if rating_tag:
        m = re.search(r"(\d+\.?\d*)", rating_tag.get_text())
        if m:
            rating = float(m.group(1))

    # Availability
    avail_tag = soup.find(id="availability")
    availability = avail_tag.get_text(strip=True) if avail_tag else "unavailable"

    return {
        "platform": "Amazon India",
        "title": title,
        "brand": brand,
        "price": price,
        "rating": rating,
        "availability": availability,
        "seller": "Amazon",
        "url": url,
    }


def _extract_flipkart(soup: BeautifulSoup, url: str) -> dict:
    title_tag = soup.find("span", class_=re.compile(r"B_NuCI|title")) or soup.find("h1")
    title = title_tag.get_text(strip=True) if title_tag else ""

    price = None
    price_tag = soup.find("div", class_=re.compile(r"_30jeq3|_16Jk6d"))
    if price_tag:
        price_str = re.sub(r"[^\d]", "", price_tag.get_text())
        try:
            price = float(price_str)
        except ValueError:
            pass

    rating = None
    rating_tag = soup.find("div", class_=re.compile(r"_3LWZlK"))
    if rating_tag:
        try:
            rating = float(rating_tag.get_text(strip=True))
        except ValueError:
            pass

    return {
        "platform": "Flipkart",
        "title": title,
        "brand": _infer_brand_from_title(title),
        "price": price,
        "rating": rating,
        "availability": "In Stock" if price else "unavailable",
        "seller": "Flipkart",
        "url": url,
    }


def _extract_croma(soup: BeautifulSoup, url: str) -> dict:
    title_tag = soup.find("h1") or soup.find(class_=re.compile(r"product-title|pdp-title"))
    title = title_tag.get_text(strip=True) if title_tag else ""

    price = None
    price_tag = soup.find(class_=re.compile(r"amount|price"))
    if price_tag:
        price_str = re.sub(r"[^\d]", "", price_tag.get_text())
        try:
            price = float(price_str)
        except ValueError:
            pass

    return {
        "platform": "Croma",
        "title": title,
        "brand": _infer_brand_from_title(title),
        "price": price,
        "rating": None,
        "availability": "In Stock" if price else "unavailable",
        "seller": "Croma",
        "url": url,
    }


def _extract_generic(soup: BeautifulSoup, url: str) -> dict:
    title_tag = soup.find("h1") or soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else ""
    domain = urlparse(url).netloc.replace("www.", "")

    return {
        "platform": domain,
        "title": title,
        "brand": _infer_brand_from_title(title),
        "price": None,
        "rating": None,
        "availability": "unavailable",
        "seller": domain,
        "url": url,
    }


def _infer_brand_from_title(title: str) -> str:
    """Heuristic: first word of title is often the brand."""
    known_brands = [
        "Samsung", "Apple", "OnePlus", "Xiaomi", "Redmi", "Realme", "OPPO", "Vivo",
        "Nokia", "Motorola", "Sony", "LG", "Lenovo", "HP", "Dell", "Asus", "Acer",
        "Bosch", "Philips", "Havells", "Dyson", "JBL", "Bose", "Boat", "Noise",
        "Nike", "Adidas", "Puma", "Levi's",
    ]
    title_lower = title.lower()
    for brand in known_brands:
        if brand.lower() in title_lower:
            return brand
    # Fallback: first word
    parts = title.split()
    return parts[0] if parts else ""


def extract_from_text(product_text: str) -> dict:
    """Normalize free-text product name into structured attributes."""
    brand = _infer_brand_from_title(product_text)

    # Extract storage/RAM patterns
    attributes = []
    storage_match = re.findall(r'\b(\d+\s*(?:GB|TB|MB))\b', product_text, re.IGNORECASE)
    attributes.extend(storage_match)

    ram_match = re.findall(r'\b(\d+\s*GB\s*RAM)\b', product_text, re.IGNORECASE)
    attributes.extend(ram_match)

    color_match = re.findall(
        r'\b(Black|White|Blue|Red|Green|Gold|Silver|Gray|Grey|Purple|Pink|Midnight|Starlight)\b',
        product_text, re.IGNORECASE
    )
    attributes.extend(color_match)

    # Infer category
    category = _infer_category(product_text)

    # Model: remove brand from text to get model
    model = product_text.replace(brand, "").strip()

    return {
        "title": product_text,
        "brand": brand,
        "model": model,
        "key_attributes": list(set(attributes)),
        "category": category,
    }


def _infer_category(text: str) -> str:
    text_lower = text.lower()
    categories = {
        "smartphone": ["iphone", "galaxy", "oneplus", "pixel", "smartphone", "mobile", "phone"],
        "laptop": ["laptop", "macbook", "thinkpad", "notebook"],
        "tablet": ["ipad", "tablet"],
        "headphones": ["headphone", "earphone", "airpods", "earbuds", "tws", "neckband"],
        "tv": ["television", " tv ", "qled", "oled", "smart tv"],
        "appliance": ["washing machine", "refrigerator", "fridge", "ac ", "air conditioner"],
    }
    for cat, keywords in categories.items():
        if any(kw in text_lower for kw in keywords):
            return cat
    return "electronics"


# ─────────────────────────────────────────────
# STEP 3: BUILD CANONICAL PRODUCT IDENTITY
# ─────────────────────────────────────────────

def build_cpi(extracted: dict) -> CanonicalProductIdentity:
    """Build the single canonical reference object from extracted data."""
    title = extracted.get("title", "")
    brand = extracted.get("brand", "") or _infer_brand_from_title(title)
    model = extracted.get("model", title.replace(brand, "").strip())
    key_attributes = extracted.get("key_attributes", [])
    category = extracted.get("category", _infer_category(title))

    # Split product_line from model if possible (e.g. "Galaxy S24 Ultra 256GB" → line="Galaxy S24 Ultra")
    product_line = re.sub(r'\s+\d+GB.*$', '', model, flags=re.IGNORECASE).strip() or model

    return CanonicalProductIdentity(
        brand=brand,
        product_line=product_line,
        model=model,
        key_attributes=key_attributes,
        category=category,
    )


# ─────────────────────────────────────────────
# STEP 4: DISCOVER PRODUCT ON OTHER MARKETPLACES
# ─────────────────────────────────────────────

def build_search_query(cpi: CanonicalProductIdentity, marketplace_domain: str) -> str:
    """Construct a targeted search query for a given marketplace."""
    attrs = " ".join(cpi.key_attributes[:2])  # limit noise
    query = f"{cpi.brand} {cpi.product_line} {attrs} site:{marketplace_domain}"
    return query.strip()


def search_marketplace(cpi: CanonicalProductIdentity, marketplace: dict, tavily_api_key: str) -> Optional[str]:
    """
    Use Tavily API to find the product on a specific marketplace.
    Returns the best matching product URL or None.
    """
    if not tavily_api_key:
        logger.warning("TAVILY_API_KEY not configured. Search disabled.")
        return None

    query = build_search_query(cpi, marketplace["domain"])
    try:
        resp = requests.post(
            "https://api.tavily.com/search",
            json={
                "api_key": tavily_api_key,
                "query": query,
                "search_depth": "basic",
                "max_results": 5,
            },
            timeout=15
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [])
        for result in results:
            link = result.get("url", "")
            if marketplace["domain"] in link:
                return link
    except Exception as e:
        logger.warning(f"Tavily API error for {marketplace['name']}: {e}")
    return None


# ─────────────────────────────────────────────
# STEP 5: VERIFY PRODUCT MATCH
# ─────────────────────────────────────────────

def compute_match_score(cpi: CanonicalProductIdentity, page_data: dict) -> float:
    """
    Compare scraped page data against CPI.
    Returns a score 0.0–1.0.
    """
    if not page_data:
        return 0.0

    page_title = (page_data.get("title") or "").lower()
    page_brand = (page_data.get("brand") or "").lower()
    cpi_brand = cpi.brand.lower()
    cpi_model = cpi.model.lower()

    scores = []

    # Brand match (weight: 0.35)
    if cpi_brand and page_brand:
        brand_sim = SequenceMatcher(None, cpi_brand, page_brand).ratio()
        scores.append(("brand", brand_sim, 0.35))
    elif cpi_brand and cpi_brand in page_title:
        scores.append(("brand", 1.0, 0.35))
    else:
        scores.append(("brand", 0.0, 0.35))

    # Model name in title (weight: 0.40)
    model_keywords = [w for w in cpi_model.split() if len(w) > 2]
    if model_keywords:
        hits = sum(1 for kw in model_keywords if kw.lower() in page_title)
        model_score = hits / len(model_keywords)
        scores.append(("model", model_score, 0.40))

    # Key attributes match (weight: 0.25)
    if cpi.key_attributes:
        attr_hits = sum(1 for attr in cpi.key_attributes if attr.lower() in page_title)
        attr_score = attr_hits / len(cpi.key_attributes)
        scores.append(("attributes", attr_score, 0.25))

    if not scores:
        return 0.0

    total_weight = sum(w for _, _, w in scores)
    weighted_score = sum(s * w for _, s, w in scores) / total_weight
    return round(weighted_score, 3)


# ─────────────────────────────────────────────
# STEP 6: EXTRACT COMPARABLE DATA
# ─────────────────────────────────────────────

def extract_comparable_data(page_data: dict, marketplace_name: str, url: str) -> PlatformResult:
    """Package verified page data into a PlatformResult."""
    return PlatformResult(
        platform=marketplace_name,
        price=page_data.get("price"),
        availability=page_data.get("availability", "unavailable"),
        seller=page_data.get("seller", ""),
        rating=page_data.get("rating"),
        url=url,
    )


# ─────────────────────────────────────────────
# MAIN AGENT PIPELINE
# ─────────────────────────────────────────────

def run_comparison_agent(
    user_input: str,
    tavily_api_key: str,
    target_marketplaces: list,
    min_match_score: float = 0.8,
    image_data: bytes = None,
    openrouter_api_key: str = "",
) -> dict:
    """
    Full 7-step pipeline. Returns the final JSON-serialisable dict.
    """
    result = ComparisonOutput()

    # ── STEP 1 ──
    has_image = image_data is not None
    input_type = determine_input_type(user_input, has_image=has_image)
    logger.info(f"Input type: {input_type}")

    # ── STEP 2 ──
    if input_type == "product_url":
        extracted = extract_from_url(user_input)
        source_url = user_input
        source_platform = urlparse(user_input).netloc.replace("www.", "")
    elif input_type == "product_image":
        # Image analysis would use a vision API (e.g. Claude Vision)
        # For now return a structured error asking for clarification
        return {
            "product_identity": {"brand": "", "product": "", "variant": ""},
            "comparisons": [],
            "confidence": 0.0,
            "error": "Image input requires vision API integration. Please provide a product name or URL.",
        }
    else:
        extracted = extract_from_text(user_input)
        source_url = None
        source_platform = None

    if not extracted:
        return {
            "product_identity": {"brand": "", "product": "", "variant": ""},
            "comparisons": [],
            "confidence": 0.0,
            "error": "Could not extract product information from input.",
        }

    # ── STEP 3 ──
    cpi = build_cpi(extracted)
    logger.info(f"CPI: {asdict(cpi)}")

    result.product_identity = {
        "brand": cpi.brand,
        "product": cpi.product_line,
        "variant": " ".join(cpi.key_attributes),
    }

    # ── STEPS 4–6: per marketplace ──
    comparisons = []
    verified_count = 0

    # If we already have source data (from a URL scrape), add it first
    if source_url and extracted.get("price") is not None:
        source_result = PlatformResult(
            platform=extracted.get("platform", source_platform),
            price=extracted.get("price"),
            availability=extracted.get("availability", "unavailable"),
            seller=extracted.get("seller", ""),
            rating=extracted.get("rating"),
            url=source_url,
            match_score=1.0,
        )
        comparisons.append(source_result)
        verified_count += 1

    # Search other marketplaces
    for marketplace in target_marketplaces:
        # Skip if this is the source marketplace
        if source_platform and marketplace["domain"] in source_platform:
            continue

        # STEP 4: Discover URL
        product_url = search_marketplace(cpi, marketplace, tavily_api_key)
        if not product_url:
            logger.info(f"No URL found for {marketplace['name']}")
            continue

        # STEP 5: Scrape and verify
        page_data = extract_from_url(product_url)
        if not page_data:
            continue

        score = compute_match_score(cpi, page_data)
        logger.info(f"{marketplace['name']} match score: {score}")

        if score < min_match_score:
            logger.info(f"Discarding {marketplace['name']} result (score {score} < {min_match_score})")
            continue

        # STEP 6: Package data
        platform_result = extract_comparable_data(page_data, marketplace["name"], product_url)
        platform_result.match_score = score
        comparisons.append(platform_result)
        verified_count += 1

        # Polite delay
        time.sleep(0.5)

    # ── STEP 7: Build output ──
    result.comparisons = [
        {
            "platform": c.platform,
            "price": c.price,
            "availability": c.availability,
            "seller": c.seller,
            "rating": c.rating,
            "url": c.url,
        }
        for c in comparisons
    ]

    # Confidence: proportion of marketplaces returning valid results
    total = len(target_marketplaces)
    result.confidence = round(verified_count / total, 2) if total > 0 else 0.0

    return {
        "product_identity": result.product_identity,
        "comparisons": result.comparisons,
        "confidence": result.confidence,
    }