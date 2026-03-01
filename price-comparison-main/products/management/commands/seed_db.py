import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from products.models import Category, Product, StoreProduct, PriceHistory

class Command(BaseCommand):
    help = 'High-Efficiency Database Seeder for Gold Standard presentation milestones.'

    @transaction.atomic
    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Initiating High-Efficiency Data Injection...'))

        # Professional Data Set
        seeded_products = [
            {"name": "iPhone 15 Pro Max 256GB", "brand": "Apple", "base_price": 145000},
            {"name": "Samsung Galaxy S24 Ultra", "brand": "Samsung", "base_price": 130000},
            {"name": "Sony WH-1000XM5 Wireless Headphones", "brand": "Sony", "base_price": 27000},
            {"name": "MacBook Pro M3 14-inch", "brand": "Apple", "base_price": 160000},
            {"name": "PlayStation 5 Console", "brand": "Sony", "base_price": 55000},
            {"name": "Dell XPS 15 Laptop", "brand": "Dell", "base_price": 140000},
            {"name": "Dyson Airwrap Multi-Styler", "brand": "Dyson", "base_price": 45000},
            {"name": "GoPro HERO12 Black", "brand": "GoPro", "base_price": 38000},
            {"name": "LG C3 55-inch OLED TV", "brand": "LG", "base_price": 125000},
            {"name": "Nintendo Switch OLED", "brand": "Nintendo", "base_price": 32000},
        ]

        # Ensure Root Category Setup
        category, _ = Category.objects.get_or_create(name="Electronics", slug="electronics")
        stores = ['AMAZON', 'FLIPKART']
        
        total_price_logs = []
        now = timezone.now()

        # O(n) Mapping for Seeding
        for item in seeded_products:
            product, _ = Product.objects.get_or_create(
                name=item["name"],
                defaults={
                    "brand": item["brand"],
                    "category": category,
                    "image_url": f"https://example.com/images/{item['name'].replace(' ', '_').lower()}.jpg",
                    "description": f"Professional-grade {item['name']} by {item['brand']}.",
                }
            )

            for store in stores:
                variance = random.uniform(0.95, 1.05)
                current_price = round(item["base_price"] * variance, 2)
                
                store_product, sp_created = StoreProduct.objects.get_or_create(
                    product=product,
                    store_name=store,
                    defaults={
                        "store_url": f"https://www.{store.lower()}.com/p/{product.slug}",
                        "current_price": current_price,
                        "availability": True,
                    }
                )

                if sp_created:
                    for days_ago in range(7, 0, -1):
                        hist_variance = random.uniform(0.9, 1.1)
                        hist_price = round(item["base_price"] * hist_variance, 2)
                        
                        # Note: We append unsaved instances.
                        # `bulk_create` bypasses `auto_now_add` in standard configs
                        log = PriceHistory(
                            store_product=store_product,
                            price=hist_price,
                        )
                        # Manually force the timestamp (if model allows setting on instance before save)
                        log.timestamp = now - timedelta(days=days_ago)
                        total_price_logs.append(log)

        # High-Efficiency Bulk Injection (O(1) query execution)
        if total_price_logs:
            PriceHistory.objects.bulk_create(total_price_logs)
            
            # Django auto_now_add safety patch post-bulk
            # Note: Explicit update to ensure temporal variance is locked
            for log in total_price_logs:
                 PriceHistory.objects.filter(id=log.id).update(timestamp=log.timestamp)

        self.stdout.write(self.style.SUCCESS(f'Successfully injected {len(seeded_products)} Products, {len(seeded_products)*2} Store Listings, and {len(total_price_logs)} Price Logs.'))

