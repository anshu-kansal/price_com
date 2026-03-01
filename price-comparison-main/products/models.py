import uuid
from typing import Any, Iterable, Optional, Type

from django.db import models
from django.utils.text import slugify
from django.conf import settings


class ActiveManager(models.Manager):
    """
    Custom manager filtering out soft-deleted records.
    Ensures Product.objects.all() exclusively returns active entities.
    """
    def get_queryset(self) -> models.QuerySet:
        return super().get_queryset().filter(is_active=True)


class Category(models.Model):
    """
    Represents a hierarchical product category.
    Allows for structured product categorization (e.g., Electronics -> Mobile Phones).
    """
    name = models.CharField(max_length=255, db_index=True, help_text="Category name")
    slug = models.SlugField(max_length=255, unique=True, db_index=True, help_text="SEO-friendly unique slug mapping")
    parent_category = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='subcategories',
        db_index=True,
        help_text="Self-referencing mapping for nested hierarchical structuring."
    )

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

    def get_breadcrumb_path(self) -> str:
        """
        Recursively construct the full breadcrumb path.
        Example output: 'Electronics > Mobiles > Smartphones'
        Note for API usage: Consider caching or using `select_related('parent_category')` to prevent N+1 queries.
        """
        path = [self.name]
        parent = self.parent_category
        while parent is not None:
            path.append(parent.name)
            parent = parent.parent_category
        # Reverse and join the path elements
        return " > ".join(path[::-1])

    def __str__(self) -> str:
        """Returns the full hierarchical category trail via breadcrumbs."""
        return self.get_breadcrumb_path()


class Product(models.Model):
    """
    Master Product model representing the core entity blueprint.
    Designed for rapid query access employing high performance multi-column indexing.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, help_text="Secure, globally unique immutable identifier.")
    sku = models.CharField(
        max_length=100, 
        unique=True, 
        db_index=True, 
        null=True, 
        blank=True, 
        help_text="SKU or GTIN/EAN to precisely match assets across platforms, circumventing text-name discrepancies."
    )
    is_active = models.BooleanField(
        default=True, 
        db_index=True, 
        help_text="Soft deletion flag. Preserves historical relationships without purging database rows."
    )
    name = models.CharField(max_length=255, db_index=True, help_text="Universal product nomenclature.")
    brand = models.CharField(max_length=255, db_index=True, help_text="Parent manufacturer label.")
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,  # Use PROTECT to prevent accidental mass historical deletion if a category collapses.
        related_name='products',
        help_text="Primary domain classification."
    )
    image_url = models.URLField(max_length=500, blank=True, null=True, help_text="Hosted URL to the main product visual representation.")
    description = models.TextField(blank=True, help_text="Expanded qualitative product information.")
    slug = models.SlugField(max_length=500, unique=True, db_index=True, help_text="Auto-generating unique string for frontend routing.")

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['name', 'brand']),
            models.Index(fields=['sku']),
        ]

    # Explicitly attach the custom ActiveManager alongside default models.Manager for admin fallback
    objects = ActiveManager()
    all_objects = models.Manager()

    def delete(self, using: Optional[str] = None, keep_parents: bool = False) -> tuple[int, dict[str, int]]:
        """
        Soft Deletion Override: Protects Analytics.
        Flips the active boolean rather than hard purging the entity.
        Returns a mock tuple mimicking standard Django delete() response.
        """
        self.is_active = False
        self.save(update_fields=['is_active'])
        return 1, {self._meta.label: 1}

    def save(
        self,
        force_insert: bool = False,
        force_update: bool = False,
        using: Optional[str] = None,
        update_fields: Optional[Iterable[str]] = None,
    ) -> None:
        """Trigger-logic to assemble unprovided unique dynamic slugs utilizing the brand and core appellation."""
        if not self.slug:
            # Construct a base slug, falling back to id if extremely non-unique configurations are passed
            base_slug = slugify(f"{self.brand} {self.name}")
            self.slug = base_slug
        super().save(force_insert=force_insert, force_update=force_update, using=using, update_fields=update_fields)

    def __str__(self) -> str:
        """Returns human-readable representation, typically 'Brand Name' format."""
        return f"{self.brand} {self.name}"


class StoreProduct(models.Model):
    """
    The distinct e-commerce store instance listing mapping back securely to the central Product schema.
    Precision metric optimized to evade rounding inconsistencies logic-side.
    """
    STORE_CHOICES = [
        ('AMAZON', 'Amazon'),
        ('FLIPKART', 'Flipkart'),
        ('RELIANCE_DIGITAL', 'Reliance Digital'),
        ('MYNTRA', 'Myntra'),
        ('CROMA', 'Croma'),
    ]

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,  # CASCADE is acceptable here: if the master product vanishes, store listings have no context.
        related_name='store_variants',
        help_text="Anchor to the master Blueprint entity"
    )
    store_name = models.CharField(
        max_length=50, 
        choices=STORE_CHOICES, 
        db_index=True, 
        help_text="Verified authorized retailer identity mapping"
    )
    store_url = models.URLField(
        max_length=1000, 
        help_text="Immediate direct URL redirect linkage for consumer acquisition"
    )
    current_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        help_text="Absolute financial metric integer. Guaranteed against floating point precision corruption."
    )
    is_active = models.BooleanField(
        default=True, 
        db_index=True, 
        help_text="Soft deletion flag preserving pricing history matrices."
    )
    availability = models.BooleanField(
        default=True, 
        db_index=True, 
        help_text="Boolean logic reflecting instantaneous stock capacities."
    )
    rating = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        null=True, 
        blank=True, 
        help_text="Decentralized store-explicit rating score metric."
    )
    last_updated = models.DateTimeField(
        auto_now=True, 
        db_index=True, 
        help_text="Date metric reflecting chronologic recency from the scraper agent."
    )

    class Meta:
        unique_together = ('product', 'store_name')
        ordering = ['-last_updated']

    objects = ActiveManager()
    all_objects = models.Manager()

    def delete(self, using: Optional[str] = None, keep_parents: bool = False) -> tuple[int, dict[str, int]]:
        """
        Soft Deletion Override.
        Ensures detached analytics arrays are not orphaned if a store ceases listing the item.
        """
        self.is_active = False
        self.save(update_fields=['is_active'])
        return 1, {self._meta.label: 1}

    def __str__(self) -> str:
        """Explicit labels targeting administrative clarity."""
        store_display = self.get_store_name_display()
        return f"{self.product.name} on {store_display} - ₹{self.current_price}"


class PriceHistory(models.Model):
    """
    Time-series optimized data repository archiving financial fluctuation metrics exclusively targeting graph/chart derivations.
    """
    store_product = models.ForeignKey(
        StoreProduct,
        on_delete=models.CASCADE,
        related_name='price_logs',
        help_text="Relationship to the exact retailer listing to isolate variations safely."
    )
    price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        help_text="Static snap-shot of historic price matrix values."
    )
    timestamp = models.DateTimeField(
        auto_now_add=True, 
        db_index=True, 
        help_text="Accelerated Indexed recording timestamp for blazing Chart.js/Recharts historical API payload serialization."
    )

    class Meta:
        ordering = ['-timestamp']
        verbose_name_plural = "Price Histories"

    def __str__(self) -> str:
        """Historical contextual visual logging."""
        store_display = self.store_product.get_store_name_display()
        return f"{self.store_product.product.name} on {store_display} - ₹{self.price} at {self.timestamp.strftime('%Y-%m-%d %H:%M')}"


class Notification(models.Model):
    """
    Notification Layer (Anti-Crash Feedback).
    Stores real-time outcome messages dispatched by Django Signals when scrapers finish.
    Ready to be consumed by Frontend React polling.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    message = models.CharField(max_length=255)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"Notification: {self.message}"
