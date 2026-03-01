
# from django.contrib import admin
# from django.urls import path, include  # ← MAKE SURE 'include' IS IMPORTED

# urlpatterns = [
#     path('admin/', admin.site.urls),
#     path('api/', include('users.urls')),  # ← THIS LINE MUST EXIST
# ]
# config/urls.py
# config/urls.py
# config/urls.py
# config/urls.py

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')),  # This includes all /api/ routes from users app
    path('api/', include('products.urls')), # Link newly configured API endpoints
]