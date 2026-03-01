from django.urls import path
from products.views import ProductSearchView, TaskStatusView, HealthCheckView, RecommendationsView, DashboardSummaryView, ScanProductView

urlpatterns = [
    path('products/search/', ProductSearchView.as_view(), name='product-search'),
    path('products/scan/', ScanProductView.as_view(), name='product-scan'),
    path('products/recommendations/', RecommendationsView.as_view(), name='product-recommendations'),
    path('dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('tasks/status/<str:task_id>/', TaskStatusView.as_view(), name='task-status'),
    path('health/', HealthCheckView.as_view(), name='health-check'),
]
