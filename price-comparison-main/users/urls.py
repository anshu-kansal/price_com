# from django.urls import path
# from .views import RegisterView, LoginView, GoogleLoginView

# urlpatterns = [
#     path('register/', RegisterView.as_view(), name='register'),
#     path('login/', LoginView.as_view(), name='login'),
#     path('google-login/', GoogleLoginView.as_view(), name='google-login'),
# ]
# users/urls.py
# users/urls.py
# users/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')),  # This includes all /api/ routes from users app
]# users/urls.py
from django.urls import path, include
from . import views

urlpatterns = [
    path('google-login/', views.google_login, name='google-login'),
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('check-user/', views.check_user_exists, name='check-user'),
    path('test/', views.test, name='test'),
    path('password-reset/', include('password_reset.urls')),
]