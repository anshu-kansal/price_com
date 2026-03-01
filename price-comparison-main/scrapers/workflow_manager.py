import concurrent.futures
import logging
from decimal import Decimal
from typing import Any, Dict, List
from urllib.parse import urlparse
from selenium.common.exceptions import TimeoutException

from scrapers.amazon_scraper import AmazonScraper
from scrapers.flipkart_scraper import FlipkartScraper

logger = logging.getLogger(__name__)


def validate_data(data: Dict[str, Any]) -> bool:
    """
    Rigid Validation (The 'Filter'):
    Ensures absolute URL formation and protects against non-decimal string price corruptions.
    """
    try:
        if not data.get("title") or not data.get("price"):
            return False
            
        # Ensure Decimals are exact mathematical objects ready for Django Ingestion
        if not isinstance(data["price"], Decimal):
            return False

        # Validate URL Absolute Status
        if not data.get("product_url") or not urlparse(data["product_url"]).scheme:
            return False
            
        if data.get("image_url") and not urlparse(data["image_url"]).scheme:
            return False

        return True
    except Exception:
        return False


class ScrapingWorkflow:
    """
    Executive Workflow Logic (The 'Brain'):
    Orchestrates headless hybrid instances safely resolving execution threads.
    Implements Context Managers ensuring resources ALWAYS wipe locally avoiding server memory leaks.
    """

    def __init__(self) -> None:
        # Utilizing Context-managed Engine Classes
        self.scraper_classes = [AmazonScraper, FlipkartScraper]

    def _execute_scraper(self, ScraperClass: type, query: str) -> List[Dict[str, Any]]:
        """
        Spawns a highly-optimized instance.
        """
        valid_results: List[Dict[str, Any]] = []
        try:
            logger.info(f"Initiating Engine {ScraperClass.__name__} for: '{query}'")
            # Context Manager '__enter__' instantiates headless driver; '__exit__' kills it instantly 
            with ScraperClass() as scraper_instance:
                raw_data = scraper_instance.scrape(query)

            # Route through Rigid Validation Pipe
            for item in raw_data:
                # Anti-Block Check: Allow error messages to passthrough validation unharmed
                if item.get("error") == "BOT_DETECTED":
                    valid_results.append(item)
                elif validate_data(item):
                    valid_results.append(item)
                    
            return valid_results
        except TimeoutException as te:
            # Output directly to Celery console to trigger Flower Dashboard error logging
            logger.error(f"TimeoutException in {ScraperClass.__name__}: Target failed to render within explicitly defined timeframe. Traceback: {str(te)}")
            # Scraper Diagnostics: the engine was likely blocked by bot-protection
            return [{"error": "BOT_DETECTED", "store_name": getattr(ScraperClass, "STORE_NAME", "UNKNOWN")}]
        except Exception as e:
            logger.error(f"Thread Failure in {ScraperClass.__name__}: {str(e)}")
            # Return partial/empty list strictly to preserve Serializer integrity
            return []

    def run(self, query: str) -> List[Dict[str, Any]]:
        """
        Launch concurrent ThreadPools extracting cross-commerce domains in parallel.
        Limits server usage explicitly rather than running linearly.
        """
        aggregated_results: List[Dict[str, Any]] = []

        with concurrent.futures.ThreadPoolExecutor(max_workers=len(self.scraper_classes)) as executor:
            future_to_class = {
                executor.submit(self._execute_scraper, ScraperCls, query): ScraperCls
                for ScraperCls in self.scraper_classes
            }

            for future in concurrent.futures.as_completed(future_to_class):
                ScraperCls = future_to_class[future]
                try:
                    data = future.result()
                    if data:
                        logger.info(f"{ScraperCls.__name__} validated & fetched {len(data)} items concurrently.")
                        aggregated_results.extend(data)
                except Exception as exc:
                    logger.error(f"Execution aggregation generated an exception in {ScraperCls.__name__}: {exc}")

        return aggregated_results


# Direct interface linking for Backend execution pipelines (e.g., Celery Tasks)
def trigger_scrapers_sync(query: str) -> List[Dict[str, Any]]:
    """
    Synchronized trigger resolving the Executive Workflow.
    """
    workflow = ScrapingWorkflow()
    return workflow.run(query)
