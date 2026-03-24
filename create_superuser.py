#!/usr/bin/env python
"""
Script to create a Django superuser programmatically
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import IntegrityError

User = get_user_model()

# Check if superuser already exists
if User.objects.filter(is_superuser=True).exists():
    su = User.objects.filter(is_superuser=True).first()
    print("✅ A superuser already exists!")
    print(f"   Email: {su.email}")
    print(f"\n📍 Access Django admin at: http://127.0.0.1:8000/admin/")
else:
    try:
        # Create new superuser
        user = User.objects.create_superuser(
            username='admin',
            email='admin@pricecom.local',
            password='Admin@123456'
        )
        print("✅ Superuser created successfully!")
        print(f"\n📧 Email: admin@pricecom.local")
        print(f"🔑 Password: Admin@123456")
        print(f"\n📍 Access Django admin at: http://127.0.0.1:8000/admin/")
        print("\n⚠️  Please change this password after first login!")
    except IntegrityError as e:
        print(f"❌ Error creating superuser: {e}")
