from typing import Any, Type

from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from products.models import StoreProduct, PriceHistory

@receiver(pre_save, sender=StoreProduct)
def cache_old_price(sender: Type[StoreProduct], instance: StoreProduct, **kwargs: Any) -> None:
    """
    Smart Automation (Part 1/2):
    Captures the existing price from the database before the new data overrides it.
    We attach it temporarily to the instance object.
    """
    if instance.pk:
        # Fetch the old value from the DB explicitly
        old_instance = StoreProduct.objects.get(pk=instance.pk)
        instance._old_price = old_instance.current_price
    else:
        # It's a brand new entity
        instance._old_price = None


@receiver(post_save, sender=StoreProduct)
def track_price_history(sender: Type[StoreProduct], instance: StoreProduct, created: bool, **kwargs: Any) -> None:
    """
    Smart Automation (Part 2/2):
    Automated Price Log Tracking & Server Optimization:
    Triggers intrinsically upon StoreProduct changes.
    Appends a new entry to the immutable PriceHistory table ONLY if the current_price explicitly fluctuates.
    This logic guards against server database bloating and restricts redundant I/O disk space operations.
    """
    
    # We only care if 'current_price' is actually in the update_fields payload.
    # If a scraper only updates 'availability' or 'last_updated', we can skip history checks entirely.
    update_fields = kwargs.get('update_fields')
    
    if not created and update_fields is not None and 'current_price' not in update_fields:
        return

    if created:
        # Genesis Log: Instantiates an initial price checkpoint if the StoreProduct is brand new.
        PriceHistory.objects.create(
            store_product=instance,
            price=instance.current_price
        )
    else:
        # Smart Check: Compare against the pre_save cached old_price.
        old_price = getattr(instance, '_old_price', None)
        
        if old_price is None or old_price != instance.current_price:
            PriceHistory.objects.create(
                store_product=instance,
                price=instance.current_price
            )
