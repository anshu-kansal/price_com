from django.urls import path, include
from .views import RegisterView, LoginView, login_page, signup_page, dashboard_page, DashboardDataView, ProductListCreateView
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenObtainPairView
)

urlpatterns = [
    # API endpoints
    path('api/register/', RegisterView.as_view(), name='register'),
    path('api/login/', LoginView.as_view(), name='login'),
    path("api/token/", TokenObtainPairView.as_view(), name="get_token"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="refresh_token"),
    path("api/dashboard-data/", DashboardDataView.as_view(), name="dashboard_data"),
    path("api/products/", ProductListCreateView.as_view(), name="product_list_create"),
    
    # UI endpoints
    path('login-ui/', login_page, name='login_page'),
    path('signup-ui/', signup_page, name='signup_page'),
    path('dashboard/', dashboard_page, name='dashboard_page'),
]
