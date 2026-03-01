import logging
from typing import Any

from celery import shared_task
from celery.signals import task_postrun
from django.db import transaction

from scrapers.workflow_manager import ScrapingWorkflow
from products.models import Product, Category, StoreProduct, Notification

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, rate_limit='10/m')
def scrape_product_task(self, query: str) -> dict[str, Any]:
    """
    Background Task executing heavy parallel Headless Selenium operations.
    Solves the Request Timeout constraint, returning instantly up front while this executes detached.
    Implements retry mechanisms managing transient network failures smoothly.
    Rate-limited implicitly preventing E-Commerce firewall triggers.
    """
    
    # State 1: Acknowledge spin-up allowing frontend loading bars to render immediately
    self.update_state(state='STARTED', meta={'status': 'Spinning up WebDriver context...'})
    
    try:
        # State 2: Active execution of the Scraper Modules.
        # Spawns threads against Amazon & Flipkart simultaneously via the Brain Orchestrator
        self.update_state(state='SCRAPING', meta={'status': 'Pulling data from E-Commerce sites concurrently...'})
        
        workflow = ScrapingWorkflow()
        scraped_data_list = workflow.run(query)

        if not scraped_data_list:
            # Empty list implies no hits or bot blocked
            return {'status': 'Failed', 'message': 'No products parsed. Possibly blocked by anti-bot measures.'}

        self.update_state(state='SAVING', meta={'status': 'Updating database models securely...'})
        
        # State 3: Atomic Ingestion to Django.
        # Guards incomplete writes. E.g., if it crashes midway, none of the rows are saved permanently.
        with transaction.atomic():
            # Ensure an obscure parent Category exists if exact taxonomy is undefined initially natively
            default_category, _ = Category.objects.get_or_create(
                name="Uncategorized", 
                slug="uncategorized"
            )

            product = None
            
            for index, item in enumerate(scraped_data_list):
                # The first iteration dictates the Master Product details uniquely mapping the overarching entity
                if index == 0:
                    product, _ = Product.objects.update_or_create(
                        name=item['title'], # Using title as Name due to lack of standard IDs in scrapes
                        defaults={
                            'brand': item.get('brand', 'Unknown'),
                            'category': default_category,
                            'image_url': item.get('image_url', ''),
                            'is_active': True 
                        }
                    )
                
                if product:
                    # Ingest strictly the particular store's pricing/links
                    # If this store changes prices, our post_save signal auto-catches the History metric safely.
                    StoreProduct.objects.update_or_create(
                        product=product,
                        store_name=item['store_name'],
                        defaults={
                            'store_url': item['product_url'],
                            'current_price': item['price'],
                            'rating': item.get('rating'),
                            'availability': True, # Assume available if freshly scraped
                            'is_active': True
                        }
                    )

        # Return Success Dict payload readable by AsyncResult polls 
        return {
            'status': 'SUCCESS', 
            'message': 'Scrape and Database commit finalized.', 
            'items_saved': len(scraped_data_list),
            'query': query
        }

    except Exception as e:
        logger.error(f"Celery task failure querying '{query}': {str(e)}")
        # Exponential Backoff Retry handling intermittent target server 500/503 issues
        # 1st retry at 30s, 2nd at 60s, 3rd at 120s
        raise self.retry(exc=e, countdown=30 * (2 ** self.request.retries))


@shared_task(bind=True)
def update_all_product_prices_task(self) -> dict[str, Any]:
    """
    Scheduled Core Automation Task tracking daily historical price fluctuations.
    Processes exclusively active items, grouping identical external domains 
    to dispatch efficient internal thread routines cleanly.
    """
    products = Product.objects.filter(is_active=True)
    
    # We trigger the already battle-tested scrape_product_task via delayed execution buffers.
    for index, product in enumerate(products):
        # Spacing out API hits using 'countdown' mimicking a rate-limited queue
        scrape_product_task.apply_async((product.name,), countdown=index * 15)
        
    return {'status': 'Scheduled', 'products_queued': products.count()}


@task_postrun.connect
def task_postrun_notifier(sender=None, headers=None, body=None, **kwargs):
    """
    Post-Scrape Trigger Notification Signal.
    Fires autonomously utilizing `django-celery-results` and native Celery hooks when ANY task concludes.
    Guards server integrity by tracking tracebacks silently.
    """
    task_id = kwargs.get('task_id')
    task = kwargs.get('task')
    retval = kwargs.get('retval', {})
    state = kwargs.get('state')
    
    # Only trap specifically the scraping tasks for Notification UI payloads
    if task and task.name == 'products.tasks.scrape_product_task':
        if state == 'SUCCESS' and isinstance(retval, dict):
            query = retval.get('query', 'Unknown Item')
            
            # Identify product link softly preventing IntegrityErrors
            product = Product.objects.filter(name__icontains=query).first()
            
            Notification.objects.create(
                message=f"Prices for '{query}' have been successfully tracked and updated.",
                product=product
            )
        elif state == 'FAILURE':
            Notification.objects.create(
                message=f"Scraper encountered an error processing your query. Please review logs.",
                product=None
            )

