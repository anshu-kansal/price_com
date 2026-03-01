from typing import Any
from django.contrib import admin
from django.utils.html import format_html
from django.db.models import QuerySet
from django.http import HttpRequest

from products.models import Category, Product, StoreProduct, PriceHistory

# --- Custom Admin Actions ---

@admin.action(description='Deactivate selected items (Soft Delete)')
def soft_delete_items(modeladmin: admin.ModelAdmin, request: HttpRequest, queryset: QuerySet) -> None:
    """
    Mass action replacing the default 'Delete' operation.
    Enforces Soft Deletion policy to preserve historical analytics matrices securely.
    """
    queryset.update(is_active=False)

# --- Inlines ---

class PriceHistoryInline(admin.TabularInline):
    """
    Inline Visualization: Embed PriceHistory logs inside StoreProduct instances.
    Provides immediate analytical review natively within the Store configuration view.
    """
    model = PriceHistory
    extra = 0
    readonly_fields = ['price', 'timestamp']
    can_delete = False
    ordering = ['-timestamp']
    
    def has_add_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        """Strictly disallow manual data tampering; prices are generated exclusively by scrapers."""
        return False 


class StoreProductInline(admin.TabularInline):
    """
    Inline Visualization: Show active Store listings underneath the Master Product definition.
    """
    model = StoreProduct
    extra = 0
    readonly_fields = ['store_url_link', 'current_price', 'last_updated']
    fields = ['store_name', 'store_url_link', 'current_price', 'availability', 'is_active', 'last_updated']
    
    def store_url_link(self, obj: StoreProduct) -> str:
        return format_html('<a href="{}" target="_blank">View Site</a>', obj.store_url)
    
    store_url_link.short_description = "Store Link"  # type: ignore


# --- Admins ---

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'parent_category']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']
    list_per_page = 50


@admin.register(PriceHistory)
class PriceHistoryAdmin(admin.ModelAdmin):
    """
    The Analytics View: Purely readonly representation of chronological Data metrics.
    """
    list_display = ['store_product', 'price', 'timestamp']
    list_filter = ['store_product__store_name']
    date_hierarchy = 'timestamp'
    list_per_page = 50
    readonly_fields = ['store_product', 'price', 'timestamp']

    def get_queryset(self, request: HttpRequest) -> QuerySet:
        """Optimize Querysets solving N+1 hits for nested ForeignKey mapping resolutions."""
        qs = super().get_queryset(request)
        return qs.select_related('store_product', 'store_product__product')

    def has_add_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False
        
    def has_change_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False


@admin.register(StoreProduct)
class StoreProductAdmin(admin.ModelAdmin):
    """
    The Monitoring Hub: Track scraper efficiency and price fluctuations rapidly in real-time.
    """
    list_display = ['product', 'store_name', 'current_price', 'price_change', 'availability', 'last_updated', 'is_active', 'store_link']
    list_filter = ['store_name', 'availability', 'is_active', 'last_updated']
    search_fields = ['product__name', 'product__sku', 'store_url']
    list_per_page = 50
    inlines = [PriceHistoryInline]
    actions = [soft_delete_items]

    def get_actions(self, request: HttpRequest) -> dict:
        """Override standard actions to forcibly rip out hard-deletion."""
        actions = super().get_actions(request)
        if 'delete_selected' in actions:
            del actions['delete_selected'] 
        return actions

    def get_queryset(self, request: HttpRequest) -> QuerySet:
        """Utilize massive C-level Joins fetching master labels and prefetching history logs efficiently."""
        qs = super().get_queryset(request)
        return qs.select_related('product').prefetch_related('price_logs')

    def store_link(self, obj: StoreProduct) -> str:
        """Make store_url a clickable link directly from the admin list mapping."""
        if obj.store_url:
            return format_html('<a href="{}" target="_blank">Link</a>', obj.store_url)
        return "-"
    
    store_link.short_description = "URL"  # type: ignore

    def price_change(self, obj: StoreProduct) -> str:
        """Calculated field: Compares current scraped price against the previous historical matrix entry."""
        # Logs are automatically ordered by -timestamp per the Model Meta class
        logs = list(obj.price_logs.all()[:2])
        if len(logs) > 1:
            prev_price = logs[1].price
            curr_price = logs[0].price
            if curr_price < prev_price:
                return format_html('<span style="color: green; font-weight: bold;">&#9660; {}</span>', curr_price - prev_price)
            elif curr_price > prev_price:
                return format_html('<span style="color: red; font-weight: bold;">&#9650; +{}</span>', curr_price - prev_price)
            else:
                return format_html('<span style="color: gray;">-</span>')
        return format_html('<span style="color: gray;">New</span>')
    
    price_change.short_description = "Change"  # type: ignore


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """
    Master Entity Dashboard. Nests all e-commerce variants centrally ensuring quick overarching administration.
    """
    list_display = ['name', 'brand', 'category', 'sku', 'is_active']
    search_fields = ['name', 'sku', 'brand']
    list_filter = ['brand', 'category', 'is_active']
    prepopulated_fields = {'slug': ('name',)}
    list_per_page = 50
    inlines = [StoreProductInline]
    actions = [soft_delete_items]

    def get_actions(self, request: HttpRequest) -> dict:
        """Strip raw SQL delete vectors enforcing Soft Deletion mandates."""
        actions = super().get_actions(request)
        if 'delete_selected' in actions:
            del actions['delete_selected']
        return actions

    def get_queryset(self, request: HttpRequest) -> QuerySet:
        """Optimize foreign-key lookups directly into root category dependencies."""
        qs = super().get_queryset(request)
        return qs.select_related('category')
