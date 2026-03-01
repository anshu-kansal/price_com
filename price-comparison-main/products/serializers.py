from rest_framework import serializers

from products.models import Product, StoreProduct, PriceHistory


class PriceHistorySerializer(serializers.ModelSerializer):
    """
    Time-series explicit Serializer optimizing PriceHistory payloads 
    for fast rendering via Recharts or Chart.js on the Frontend.
    """
    class Meta:
        model = PriceHistory
        fields = ['price', 'timestamp']
        read_only_fields = ['price', 'timestamp']


class StoreProductSerializer(serializers.ModelSerializer):
    """
    Serializer for individual store listings.
    Internal DB Integer IDs explicitly hidden from the payload.
    Nests the 5 most recent price logs.
    """
    store_name_display = serializers.CharField(source='get_store_name_display', read_only=True)
    recent_price_logs = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = StoreProduct
        fields = [
            'store_name',
            'store_name_display',
            'store_url',
            'current_price',
            'availability',
            'rating',
            'last_updated',
            'recent_price_logs'
        ]
        read_only_fields = fields # Lock entire serializer logically 

    def get_recent_price_logs(self, obj: StoreProduct) -> list:
        """
        Payload Optimization: Limit time-series nested graphs to the latest 5 logs.
        """
        logs = obj.price_logs.all()[:5]
        return PriceHistorySerializer(logs, many=True).data


class ProductSerializer(serializers.ModelSerializer):
    """
    Master Product payload.
    Excludes internal IDs (UUID kept) and nests complete Store configurations.
    """
    store_variants = StoreProductSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',  # UUID allowed per architecture constraint
            'name',
            'brand',
            'image_url',
            'description',
            'slug',
            'store_variants',
        ]
        read_only_fields = fields # Prevent POST/PUT mutations entirely

class DashboardTopDealSerializer(serializers.ModelSerializer):
    """
    Optimized serializer specifically for Dashboard "Top Deals"
    Maps data directly from the StoreProduct to flatten the payload.
    """
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_id = serializers.UUIDField(source='product.id', read_only=True)
    image_url = serializers.URLField(source='product.image_url', read_only=True)
    store_name_display = serializers.CharField(source='get_store_name_display', read_only=True)
    price = serializers.DecimalField(source='current_price', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = StoreProduct
        fields = [
            'product_id',
            'product_name',
            'store_name_display',
            'price',
            'store_url',
            'image_url',
        ]

