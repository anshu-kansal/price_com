from django.urls import path
from . import views

urlpatterns = [
    path('request/', views.password_reset_request, name='password-reset-request'),
    path('verify/', views.password_reset_verify, name='password-reset-verify'),
    path('reset/', views.password_reset_confirm, name='password-reset-confirm'),
]