from django.apps import AppConfig


class ProductsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'products'

    def ready(self) -> None:
        """
        Bootstrapping logic executed at application startup.
        Imports explicit signals architecture to assure they integrate formally into the Django bus dispatcher.
        """
        import products.signals  # noqa: F401
