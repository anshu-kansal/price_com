import random
import time
from typing import Any, Dict, List
from urllib.parse import quote_plus

from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from scrapers.base_scraper import ScraperEngine


class AmazonScraper(ScraperEngine):
    """
    Hybrid Amazon Scraper: Selenium enforces the JS/network connection natively,
    and BeautifulSoup immediately extracts data payload preventing DOM blocking rules.
    """

    STORE_NAME = 'AMAZON'
    BASE_URL = "https://www.amazon.in/s?k="

    def scrape(self, query: str) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []

        try:
            # Random Human-Like initialization sleep before network action
            time.sleep(random.uniform(1.0, 3.0))

            search_url = f"{self.BASE_URL}{quote_plus(query)}"
            
            # Explicit network request. Parent Context Manager guarantees `self.driver` exists here.
            self._clear_session_data()
            if self.driver:
                self.driver.get(search_url)

                # Wait efficiently for Amazon Data Blocks rather than static sleepers.
                try:
                    WebDriverWait(self.driver, 10).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, "div[data-component-type='s-search-result']"))
                    )
                except TimeoutException:
                    return [] # Target site dead or anti-bot blocked IP request entirely.

                # DOM is ready. Extract raw string instantly and parse via highly efficient 'lxml' compiled C parser.
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(self.driver.page_source, 'lxml')

                products_elements = soup.select("div[data-component-type='s-search-result']")

                for item in products_elements[:5]:  # Scope constraint for backend performance.
                    try:
                        # Validate if product is Sponsored/Ad. If so, skip organic tracking.
                        sponsored_tag = item.select_one("span.puis-sponsored-label-info")
                        if sponsored_tag:
                            continue

                        title_elem = item.select_one("h2 a span")
                        title = title_elem.text.strip() if title_elem else None

                        price_elem = item.select_one("span.a-price-whole")
                        price_str = price_elem.text if price_elem else None
                        price = self.clean_price(price_str)

                        link_elem = item.select_one("h2 a.a-link-normal")
                        product_url = "https://www.amazon.in" + link_elem.get('href') if link_elem else None

                        img_elem = item.select_one("img.s-image")
                        image_url = img_elem.get('src') if img_elem else None

                        rating_elem = item.select_one("i[data-cy='reviews-ratings-slot'] span.a-icon-alt")
                        rating_str = rating_elem.text if rating_elem else None
                        rating = self.clean_price(rating_str)

                        # Validate Mandatory Fields Context
                        if title and price and product_url:
                            results.append({
                                'store_name': self.STORE_NAME,
                                'title': title,
                                'price': price,
                                'image_url': image_url,
                                'product_url': product_url,
                                'rating': rating,
                            })
                    except Exception:
                        continue
        
        except Exception:
            pass # Catch universal failures. ContextManager (__exit__) strictly terminates zombie drivers regardless.

        return results
