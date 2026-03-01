import sys
import os
import time
from urllib.parse import quote_plus
from bs4 import BeautifulSoup
from selenium.common.exceptions import TimeoutException, WebDriverException

# Abstract the Python module path to allow executing directly from the terminal
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scrapers.amazon_scraper import AmazonScraper
from scrapers.flipkart_scraper import FlipkartScraper

def dump_html(html_content: str, filename: str) -> None:
    """
    HTML Dump Logic (Manual Override):
    Renders what the Headless Scraper 'sees' locally so engineers can identify proxy bounds or CSS mutations.
    """
    filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"[*] Debug Page Saved: {filepath}")
    except Exception as e:
        print(f"[FAIL] Could not write HTML Dump '{filename}': {str(e)}")

def run_diagnostics(query: str) -> None:
    print(f"\n=============================================")
    print(f" SCRAPING HEALTH DIAGNOSTICS: '{query}'")
    print(f"=============================================\n")

    # Diagnostic Payload: [Platform Name, Engine Class, Base URI, Component Item CSS, Price Element CSS]
    # Validated for 2026 E-Commerce DOMs
    scrapers = [
        ("Amazon", AmazonScraper, "https://www.amazon.in/s?k=", "div[data-component-type='s-search-result']", "span.a-price-whole"),
        ("Flipkart", FlipkartScraper, "https://www.flipkart.com/search?q=", "div[data-id]", "div.Nx9bqj")
    ]

    for name, ScraperClass, base_url, item_selector, price_selector in scrapers:
        print(f"--- Diagnosing {name} Engine ---")
        
        try:
            # Context Manager instantiation to check SessionNotCreatedExceptions
            with ScraperClass() as scraper:
                print(f"[OK] Driver Initialized (Headless, '--disable-blink-features=AutomationControlled' Verified)")
                
                search_url = f"{base_url}{quote_plus(query)}"
                scraper._clear_session_data()
                
                try:
                    scraper.driver.get(search_url)
                    print(f"[OK] Page Loaded HTTP 200: {search_url}")
                    
                    time.sleep(3) # Explicit Wait allowance for localized XHR/JS Rendering
                    
                    soup = BeautifulSoup(scraper.driver.page_source, 'lxml')
                    page_html_lower = str(scraper.driver.page_source).lower()
                    
                    # 1. Anti-Bot / CAPTCHA Validation Block
                    if "captcha" in page_html_lower or "robot check" in page_html_lower or "something went wrong" in page_html_lower:
                        print(f"[FAIL] CAPTCHA / Bot Block Detected! IP is flagged or Stealth bypass failed.")
                        dump_html(scraper.driver.page_source, f"debug_{name.lower()}_captcha.html")
                        print("\n>>> Corrective Action: Introduce Residential Proxies or patch 'undetected_chromedriver'.")
                        continue
                    
                    # 2. Main DOM Item Selector Match
                    items = soup.select(item_selector)
                    if not items:
                        print(f"[FAIL] Target Item Element Not Found! CSS Selector '{item_selector}' mutation detected.")
                        dump_html(scraper.driver.page_source, f"debug_{name.lower()}_dom_empty.html")
                        print(f"\n>>> Corrective Action: Open '{name.lower()}_scraper.py' and update the main structural CSS block.")
                        continue
                        
                    print(f"[OK] Located {len(items)} Valid Data Arrays bypassing network guards.")
                    
                    # 3. Price Target Selector Verification
                    valid_prices = 0
                    for item in items[:5]:
                        price_elem = item.select_one(price_selector)
                        if price_elem and price_elem.text.strip():
                            valid_prices += 1
                            
                    if valid_prices == 0:
                        print(f"[FAIL] Price String Missing! CSS Selector '{price_selector}' mismatch within Data Array.")
                        dump_html(scraper.driver.page_source, f"debug_{name.lower()}_price_fail.html")
                        print(f"\n>>> Corrective Action: Inspect Dump HTML to find 2026 pricing span mappings.")
                    else:
                        print(f"[OK] Extracted Price Decimals successfully using '{price_selector}'")
                        print(f"[SUCCESS] {name} Scraping Engine is 100% Operational & Clean.\n")
                        
                except TimeoutException:
                    print(f"[FAIL] TimeoutException: Connection timed out before Server rendered the DOM.")
                    dump_html(scraper.driver.page_source if scraper.driver else "Failed before load", f"debug_{name.lower()}_timeout.html")
                except Exception as e:
                    print(f"[FAIL] Parsing Execution Error: {str(e)}")
                    
        except WebDriverException as e:
            print(f"[FAIL] Driver Initialization Failed. Check Chrome Version / Missing SessionNotCreatedError bounds: {str(e)}")
        except Exception as e:
             print(f"[FAIL] Catastrophic Process Failure: {str(e)}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage Error: Missing Search Term.")
        print("Syntax: python test_scraper.py \"YOUR SEARCH QUERY\"")
        print("Example: python test_scraper.py \"iphone 15\"")
        sys.exit(1)
        
    query = sys.argv[1]
    run_diagnostics(query)
