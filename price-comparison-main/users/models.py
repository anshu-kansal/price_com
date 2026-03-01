# # from django.contrib.auth.models import User
# # from django.db import models


# # class UserProfile(models.Model):
# #     user = models.OneToOneField(
# #         User,
# #         on_delete=models.CASCADE,
# #         related_name="profile"
# #     )
# #     role = models.CharField(max_length=20, default="user")

# #     def __str__(self):
# #         return self.user.username

# # from django.contrib.auth.models import User
# # from django.db import models


# # class UserProfile(models.Model):
# #     ROLE_CHOICES = (
# #         ("user", "User"),
# #         ("admin", "Admin"),
# #     )

# #     user = models.OneToOneField(
# #         User,
# #         on_delete=models.CASCADE,
# #         related_name="profile"
# #     )
# #     role = models.CharField(
# #         max_length=10,
# #         choices=ROLE_CHOICES,
# #         default="user"
# #     )

# #     def __str__(self):
# #         return f"{self.user.username} - {self.role}"
# # users/models.py
# # from django.db import models
# # from django.contrib.auth.models import User


# # class UserProfile(models.Model):

# #     ROLE_CHOICES = (
# #         ("user", "User"),
# #         ("admin", "Admin"),
# #     )

# #     user = models.OneToOneField(
# #         User,
# #         on_delete=models.CASCADE,
# #         related_name="profile"
# #     )

# #     role = models.CharField(
# #         max_length=10,
# #         choices=ROLE_CHOICES,
# #         default="user"
# #     )

# #     def __str__(self):
# #         return f"{self.user.username} - {self.role}"
# from django.db import models
# from django.contrib.auth.models import User
# from django.db.models.signals import post_save
# from django.dispatch import receiver

# class UserProfile(models.Model):
#     ROLE_CHOICES = [
#         ('viewer', 'Viewer'),
#         ('editor', 'Editor'),
#         ('admin', 'Admin'),
#     ]
    
#     user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
#     role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='viewer')
#     created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
#     updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
    
#     def __str__(self):
#         return f"{self.user.username} - {self.role}"

# # FIXED: Auto-create profile when user is created
# @receiver(post_save, sender=User)
# def create_user_profile(sender, instance, created, **kwargs):
#     if created:
#         UserProfile.objects.get_or_create(user=instance)  # Use get_or_create instead of create

# @receiver(post_save, sender=User)
# def save_user_profile(sender, instance, **kwargs):
#     try:
#         instance.profile.save()
#     except UserProfile.DoesNotExist:
#         UserProfile.objects.create(user=instance)
# users/models.py
# users/models.py
# users/models.py
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models.signals import post_save
from django.dispatch import receiver
import random
import string
from datetime import datetime, timedelta

class User(AbstractUser):
    # Your existing user fields
    phone = models.CharField(max_length=15, blank=True)
    country = models.CharField(max_length=100, blank=True)
    
    def __str__(self):
        return self.username

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('viewer', 'Viewer'),
        ('editor', 'Editor'),
        ('admin', 'Admin'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='viewer')
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.role}"

class PasswordResetOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    email = models.EmailField()
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)
    
    def is_valid(self):
        if self.is_used:
            return False
        expiry_time = self.created_at + timedelta(minutes=5)
        return datetime.now() <= expiry_time
    
    @staticmethod
    def generate_otp():
        return ''.join(random.choices(string.digits, k=6))
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.email} - {self.otp}"

# Signals for UserProfile - Updated to avoid duplicates
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create UserProfile when a new user is created"""
    if created:
        # Use get_or_create to avoid duplicates
        UserProfile.objects.get_or_create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Save UserProfile when user is saved"""
    try:
        if hasattr(instance, 'profile'):
            instance.profile.save()
    except UserProfile.DoesNotExist:
        # Create profile if it doesn't exist
        UserProfile.objects.get_or_create(user=instance)