from django.db import models
from django.contrib.auth.models import User
# Create your models here.

class Product(models.Model):
    name = models.CharField(max_length=100)
    url = models.URLField()
    # image = models.ImageField(upload_to='product_images/')
    user = models.ForeignKey(User, on_delete=models.CASCADE , related_name='products')

    def __str__(self):
        return self.name
