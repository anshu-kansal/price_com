import os
import random
import re
from abc import ABCMeta, abstractmethod
from decimal import Decimal, InvalidOperation
from typing import Dict, List, Optional, Any
import logging

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

logger = logging.getLogger(__name__)


class ScraperEngine(metaclass=ABCMeta):
    """
    Advanced Hybrid Scraper Engine (Selenium + BeautifulSoup).
    Implements extremely stealthy headless Selenium logic for DOM rendering,
    passing off the payload to BeautifulSoup4 via lxml for ultra-fast parsing.
    Acts as a Context Manager to strictly enforce Memory Shields (driver.quit()).
    """

    USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    ]

    def __init__(self) -> None:
        self.driver: Optional[webdriver.Chrome] = None

    def __enter__(self) -> 'ScraperEngine':
        """
        Context Manager hook ensuring driver is instantiated cleanly upon Entry.
        """
        self.driver = self._setup_driver()
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """
        ZOMBIE PROTECTION / SERVER RESOURCE OPTIMIZATION.
        Context Manager hook ensuring the driver is irreversibly terminated upon Exit 
        regardless of Try-Catch success or crashing exceptions.
        """
        if self.driver:
            self._clear_session_data()
            try:
                self.driver.quit()
            except Exception as e:
                logger.error(f"Failed to cleanly quit driver: {e}")
            finally:
                self.driver = None

    def _setup_driver(self) -> webdriver.Chrome:
        """
        Instantiates a fully hardened, resource-optimized Chrome WebDriver.
        """
        options = Options()
        
        # 1. Server Resource Optimization (Headless Hardening)
        options.add_argument("--headless=new")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--memory-pressure-off")
        options.add_argument("--disable-extensions")
        options.add_argument("--disable-infobars")
        options.add_argument("--remote-debugging-port=9222")
        options.add_argument("--mute-audio")
        
        # 2. Asset Blocking (Massive bandwidth reduction to increase scrape speed by 2x)
        # Prevent Images, Stylesheets, and Fonts from loading via Chrome Prefs.
        prefs = {
            "profile.managed_default_content_settings.images": 2,
            "profile.managed_default_content_settings.stylesheets": 2,
            "profile.managed_default_content_settings.fonts": 2,
            "profile.default_content_setting_values.notifications": 2,
        }
        options.add_experimental_option("prefs", prefs)

        # 3. Anti-Detect Stealth Strategy: Dynamic Header Rotation & Automation Flag Hiding
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        
        user_agent = random.choice(self.USER_AGENTS)
        options.add_argument(f"user-agent={user_agent}")

        width = random.randint(1280, 1920)
        height = random.randint(720, 1080)
        options.add_argument(f"--window-size={width},{height}")

        # Automated Driver Management replacing static paths
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
        
        # Override navigator.webdriver flag natively
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        return driver

    def _clear_session_data(self) -> None:
        """
        Session Sanitization (Cookie Management):
        Ensures consecutive searches do not aggregate tracking cookies causing 403 Forbidden locks.
        """
        if self.driver:
            try:
                self.driver.delete_all_cookies()
                self.driver.execute_script("window.localStorage.clear();")
                self.driver.execute_script("window.sessionStorage.clear();")
            except Exception:
                pass # Usually fails if a page hasn't fully loaded; we ignore gracefully.

    def get_soup(self, url: str) -> Optional[BeautifulSoup]:
        """
        Hybrid Fetching Logic.
        Uses Selenium to establish the network request (and solve potential JS protections),
        then immediately hands the parsed DOM off to BeautifulSoup for CPU-efficient HTML querying.
        """
        if not self.driver:
            raise RuntimeError("WebDriver was not initialized. Call within a 'with' context layout.")
            
        try:
            self._clear_session_data() # Ensure fresh session
            self.driver.get(url)
            # The child classes will use explicit waits before parsing
            return BeautifulSoup(self.driver.page_source, 'lxml')
        except Exception as e:
            logger.error(f"Failed to fetch Soup payload for {url}: {str(e)}")
            return None

    def clean_price(self, price_str: str) -> Optional[Decimal]:
        """
        Universal data ingestion cleaner.
        Strips localized currency symbols (₹, $), commas, and casts cleanly to Decimal.
        """
        if not price_str:
            return None
        cleaned = re.sub(r'[^\d.]', '', price_str)
        try:
            return Decimal(cleaned) if cleaned else None
        except InvalidOperation:
            return None

    @abstractmethod
    def scrape(self, query: str) -> List[Dict[str, Any]]:
        """
        Mandatory implementation for executing the page traversal.
        Must return structured Dict containing: [title, price, image_url, product_url, rating, store_name]
        """
        pass
