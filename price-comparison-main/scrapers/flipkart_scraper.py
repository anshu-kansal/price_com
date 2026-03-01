import random
import time
from typing import Any, Dict, List
from urllib.parse import quote_plus

from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from scrapers.base_scraper import ScraperEngine


class FlipkartScraper(ScraperEngine):
    """
    Hybrid Flipkart Scraper setup passing Selenium-hydrated DOM 
    into BeautifulSoup to safely extract varied Row-to-Grid layouts efficiently.
    """

    STORE_NAME = 'FLIPKART'
    BASE_URL = "https://www.flipkart.com/search?q="

    def scrape(self, query: str) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []

        try:
            # Human-like delay 
            time.sleep(random.uniform(1.5, 3.5))

            search_url = f"{self.BASE_URL}{quote_plus(query)}"
            
            self._clear_session_data()
            if self.driver:
                self.driver.get(search_url)

                try:
                    WebDriverWait(self.driver, 10).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, "div[data-id]"))
                    )
                except TimeoutException:
                    return []

                # Hand-off loaded JS page source to BS4
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(self.driver.page_source, 'lxml')

                # Flipkart renders items flexibly
                products_elements = soup.select("div[data-id]")

                for item in products_elements[:5]:
                    try:
                        # Ad/Sponsored validation
                        ad_badge = item.select_one("div.AdBadge")
                        if ad_badge:
                            continue

                        # Conditional CSS Selector Layouts: Mobile Row vs Fashion Grid
                        # Adding 2026 Resiliency Fallbacks
                        title_elem = item.select_one("div.KzDlHZ") or item.select_one("a.WKTcLC") or item.select_one("a.s1Q9rs")
                        title = title_elem.text.strip() if title_elem else None

                        price_elem = item.select_one("div.Nx9bqj")
                        price_str = price_elem.text if price_elem else None
                        price = self.clean_price(price_str)

                        link_elem = item.select_one("a.CGtC98") or item.select_one("a.WKTcLC")
                        product_url = "https://www.flipkart.com" + link_elem.get('href') if link_elem else None

                        img_elem = item.select_one("img.DByuf4")
                        image_url = img_elem.get('src') if img_elem else None

                        rating_elem = item.select_one("div.XQDdHH")
                        rating_str = rating_elem.text if rating_elem else None
                        rating = self.clean_price(rating_str)

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
            pass
            
        return results
