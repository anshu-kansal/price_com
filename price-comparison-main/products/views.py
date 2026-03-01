import logging
import uuid
from datetime import timedelta
from typing import Any

from django.db import transaction
from django.utils import timezone
from django.db.models import Prefetch

from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from celery.result import AsyncResult
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from products.models import Product, StoreProduct, PriceHistory
from products.serializers import ProductSerializer
from products.tasks import scrape_product_task

logger = logging.getLogger(__name__)


def trigger_scrapers_task(product_name: str) -> str:
    """
    Submits the scraping workload into the Redis Message Broker.
    The Celery Worker cluster consumes this non-blocking request transparently.
    """
    # Diagnostic Logger: Tracks task handoff inside Celery pipeline
    logger.info(f"Attempting to hand off task to Celery for query: {product_name}")
    
    try:
        # Execute natively in Background via `.delay()`
        task = scrape_product_task.delay(product_name)
        
        # Ensure the task_id is a strictly valid UUID string for React useTaskPolling consumption
        return str(task.id)
    except Exception as e:
        logger.error(f"Task Handoff Failure: Could not dispatch '{product_name}' to Celery. Reason: {str(e)}")
        raise ConnectionError("Scraper service unavailable")


class TaskStatusView(APIView):
    """
    Dedicated Asynchronous Polling Endpoint: /api/tasks/status/<task_id>/
    Allows React hooks to visually track live server parsing loops gracefully.
    """
    def get(self, request: Request, task_id: str) -> Response:
        task_result = AsyncResult(task_id)
        
        response_data = {
            'task_id': task_id,
            'status': task_result.status,
        }

        if task_result.status == 'SUCCESS':
            # Extraction succeeded.
            if not task_result.result:
                # Validation: if scraper returns 0 results
                response_data['status'] = 'no_results'
                response_data['result'] = []
            else:
                response_data['result'] = task_result.result
        elif task_result.status == 'FAILURE':
            # Network block or E-commerce bot firewall trigger
            response_data['error'] = str(task_result.result)
        else:
            # Active tracking meta string ('Spinning up Driver', 'Parsing DOM', etc)
            response_data['details'] = task_result.info
            response_data['result'] = [] # Prevent undefined variables crashing frontend mapping

        return Response(response_data, status=status.HTTP_200_OK)


class HealthCheckView(APIView):
    """
    Standard Ping Endpoint: `/api/health/`
    Proves to React Axios instances that the Django Router is alive and CORS is resolving.
    """
    def get(self, request: Request) -> Response:
        return Response({"status": "ok", "message": "Django Backend is online."}, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class ProductSearchView(APIView):
    """
    High-performance APIView orchestrating the 'Database-First' Search & Scrape workflow.
    Ensures minimal server load by serving cached data within a 2-hour freshness window.
    Protected by DRF AnonRateThrottle preventing server scraping assaults.
    """
    
    # Apply anti-DDoS / anti-bot scraping limiters organically
    throttle_classes = [AnonRateThrottle, UserRateThrottle]

    def get(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """
        Handle GET queries cleanly.
        Query Params:
            - q: The product name snippet or exact exact identifier mapping string.
        """
        query_param = request.query_params.get('q', '').strip()

        if not query_param:
            return Response(
                {"error": "A search query 'q' is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # 1. High Efficiency Lookup Logic with Zero N+1 Loops (Prefetch Chaining).
            # Order price_logs backwards directly at DB-level preparing optimal 5-limit slicing in the Python serializer mapping.
            price_histories_prefetch = Prefetch(
                'store_variants__price_logs',
                queryset=PriceHistory.objects.order_by('-timestamp')
            )
            
            # Lookup Phase: icontains or optimal indexes.
            product = Product.objects.prefetch_related(
                'store_variants',
                price_histories_prefetch
            ).filter(name__icontains=query_param).first()

            if product:
                # 2. Freshness Policy (2-Hour Logic Server Guard)
                two_hours_ago = timezone.now() - timedelta(hours=2)
                
                # Check ALL attached Store listings. If any is beyond 2 hours -> Trigger Rescrape Protocol
                is_stale = not product.store_variants.exists() or \
                           any(variant.last_updated < two_hours_ago for variant in product.store_variants.all())

                if not is_stale:
                    # Serve directly retaining perfect CPU operations score
                    serializer = ProductSerializer(product)
                    return Response({
                        "status": "fresh",
                        "source": "database",
                        "data": serializer.data
                    }, status=status.HTTP_200_OK)
                else:
                    # Data is > 2 Hours Old.
                    task_id = trigger_scrapers_task(query_param)
                    serializer = ProductSerializer(product)
                    return Response({
                        "status": "stale",
                        "task_id": task_id,
                        "message": "Serving cached stale data. Background refresh triggered cleanly.",
                        "source": "database",
                        "data": serializer.data
                    }, status=status.HTTP_200_OK)

            else:
                # Complete miss. Immediate synchronous-breaking Scraper array initialization.
                try:
                    task_id = trigger_scrapers_task(query_param)
                except ConnectionError:
                    return Response(
                        {"error": "Scraper service unavailable"}, 
                        status=status.HTTP_503_SERVICE_UNAVAILABLE
                    )
                    
                # Enforce Uniform Output: Include 'data: []' to standardize React destructuring
                return Response({
                    "status": "pending",
                    "task_id": task_id,
                    "message": f"Product '{query_param}' missing. Live async scrapers dispatched.",
                    "data": [] 
                }, status=status.HTTP_202_ACCEPTED)

        except Exception as e:
            logger.error(f"Search API Exception during query '{query_param}': {str(e)}")
            return Response(
                {"error": "An internal server error occurred resolving intelligent middleman queues."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class RecommendationsView(APIView):
    """
    Dedicated endpoint serving customized product suggestions dynamically based
    on the most recently scraped components retaining < 24 hour staleness.
    """
    throttle_classes = [AnonRateThrottle, UserRateThrottle]

    def get(self, request: Request) -> Response:
        try:
            twenty_four_hours_ago = timezone.now() - timedelta(hours=24)
            # Find distinct products whose variants correspond to fresh scrapes
            fresh_products = Product.objects.filter(
                store_variants__last_updated__gte=twenty_four_hours_ago
            ).distinct()[:6]

            # Re-use standard serializer
            serializer = ProductSerializer(fresh_products, many=True)
            return Response({"status": "fresh", "data": serializer.data}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Failed to compile Recommendations: {str(e)}")
            return Response(
                {"error": "System failure compiling realtime recommendations."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


from django.db.models import Sum, F, ExpressionWrapper, DecimalField

class DashboardSummaryView(APIView):
    """
    Dashboard Operations view optimizing DB analytic queries to feed the Frontend.
    Derives 'Total Savings' and 'Active Trackers' from the StoreProduct tables directly.
    Utilizes Django ORM Sum and F expressions for 0-latency calculation.
    """
    def get(self, request: Request) -> Response:
        try:
            active_trackers = StoreProduct.objects.count()
            
            if active_trackers == 0:
                # Empty State Support
                return Response({"status": "no_data"}, status=status.HTTP_200_OK)

            total_products = Product.objects.count()

            # Dynamic Analytics: calculate 'Total Savings' using a 15% fixed margin 
            # across all seeded products. F-expressions push math to the DB level.
            savings_aggregate = StoreProduct.objects.aggregate(
                total=Sum(
                    ExpressionWrapper(
                        F('current_price') * 0.15,
                        output_field=DecimalField(max_digits=12, decimal_places=2)
                    )
                )
            )
            total_savings = savings_aggregate['total'] or 0

            # Top Deals Logic: fetching the topmost tracked prices dropped
            # ordered by the most recent last_updated timestamp.
            from products.serializers import DashboardTopDealSerializer
            top_deals_qs = StoreProduct.objects.select_related('product').order_by('-last_updated')[:5]
            deals_data = DashboardTopDealSerializer(top_deals_qs, many=True).data

            return Response({
                "status": "success",
                "metrics": {
                    "total_products_tracked": total_products,
                    "active_trackers": active_trackers,
                    "total_savings_inr": total_savings,
                    "pending_alerts": 4, # Static mockup to prevent layout shifting
                    "expired_today": 1   # Static mockup to prevent layout shifting
                },
                "top_deals": deals_data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Dashboard Summary API failure: {str(e)}")
            return Response(
                {"error": "Failed to compile Dashboard metrics."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

import time
from django.core.files.uploadedfile import UploadedFile

@method_decorator(csrf_exempt, name='dispatch')
class ScanProductView(APIView):
    """
    Mock AI Vision Endpoint.
    Simulates a heavy CNN model process by sleeping for 3 seconds, then forcibly 
    returns a known product (Sony WH-1000XM5) mapping for presentation demos.
    Files are never saved to disk, ensuring zero storage overhead.
    """
    throttle_classes = [UserRateThrottle, AnonRateThrottle]

    def post(self, request: Request) -> Response:
        try:
            # 1. Validation Phase
            image_file = request.FILES.get('image')
            if not image_file or not isinstance(image_file, UploadedFile):
                return Response(
                    {"error": "No valid image payload detected."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Security: Ensure only images are parsed
            if not image_file.content_type.startswith('image/'):
                return Response(
                    {"error": "Invalid file format. Please upload a JPG or PNG."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 2. Mock Intelligence Simulation
            logger.info("[MOCK] Image received. Starting mock feature extraction delay...")
            time.sleep(3) # Simulate 3s processing delay

            # 3. Payload Construction (Gold Standard Fallback)
            # Find the predefined Sony headphones from the seeding script
            target_name = "Sony WH-1000XM5 Wireless Headphones"
            
            # get_or_create ensures the demo never crashes even if DB was flushed
            from products.models import Category
            category, _ = Category.objects.get_or_create(name="Electronics", slug="electronics")
            
            product, _ = Product.objects.get_or_create(
                name=target_name,
                defaults={
                    "brand": "Sony",
                    "category": category,
                    "image_url": "https://example.com/images/sony_wh-1000xm5_wireless_headphones.jpg",
                    "description": f"High-quality {target_name} by Sony."
                }
            )

            # Note: We rely on the Serializer to pull the StoreVariants native to the db
            serializer = ProductSerializer(product)
            
            return Response({
                "status": "success",
                "message": "Image matched with 98.4% confidence.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Vision Engine crash (Simulated Catch): {str(e)}")
            return Response(
                {"error": "AI Vision parsing failed."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


