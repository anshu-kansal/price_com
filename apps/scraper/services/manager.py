from typing import List, Dict, Any
from datetime import timedelta
from django.utils import timezone

from apps.scraper.models import Product
from apps.scraper.concurrency import run_scraper_async
from apps.scraper.services.services import ScraperService

def get_coordinated_data(search_query: str) -> List[Dict[str, Any]]:
    """
    Orchestrates data retrieval:
    1. Search DB for products matching query.
    2. If found, check staleness and return.
    3. If NOT found, trigger SerpAPI scrape to fetch fresh data.
    4. Returns current data immediately.
    """
    # 1. Search Database
    products = Product.objects.filter(name__icontains=search_query).prefetch_related('prices')
    
    results = []
    six_hours_ago = timezone.now() - timedelta(hours=6)
    
    for product in products:
        product_data = {
            "name": product.name,
            "brand": product.brand,
            "category": product.category,
            "prices": []
        }
        
        for price in product.prices.all():
            product_data["prices"].append({
                "store": price.store_name,
                "price": price.current_price,
                "url": price.product_url,
                "image": price.image_url,
                "available": price.is_available,
                "last_updated": price.last_updated
            })
            
            # Check Staleness: If data older than 6 hours, re-scrape in background
            if price.last_updated < six_hours_ago:
                run_scraper_async(price.product_url, price.store_name)
        
        results.append(product_data)
    
    # 2. If no DB results, fetch from SerpAPI
    if not results:
        scraper = ScraperService()
        serp_results = scraper.search_all(search_query, limit=20)
        
        if serp_results:
            results = [{
                "name": r['name'],
                "brand": r.get('store', 'N/A'),
                "category": "Scraped",
                "prices": [{
                    "store": r['store'],
                    "price": float(r['price']),
                    "url": r['url'],
                    "image": None,
                    "available": True,
                    "last_updated": timezone.now()
                }]
            } for r in serp_results]
        else:
            # Log scraper error for debugging
            error_msg = scraper.last_error or 'Unknown error'
            import logging
            logging.getLogger(__name__).warning(f'SerpAPI search failed for "{search_query}": {error_msg}')
    
    return results
