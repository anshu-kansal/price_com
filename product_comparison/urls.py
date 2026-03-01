from django.urls import path
from .views import (
    # ── Auth ──────────────────────────────────
    RegisterView,
    LoginView,

    # ── Template pages ────────────────────────
    login_page,
    signup_page,
    dashboard_page,
    comparator_page,

    # ── Dashboard / Products ──────────────────
    DashboardDataView,
    ProductListCreateView,

    # ── Comparison Agent ──────────────────────
    CompareAPIView,
    CompareImageAPIView,
)

urlpatterns = [
    # ── Auth endpoints ────────────────────────
    path("api/register/",       RegisterView.as_view(),      name="register"),
    path("api/login/",          LoginView.as_view(),         name="login"),

    # ── Template pages ────────────────────────
    path("login/",              login_page,                  name="login_page"),
    path("signup/",             signup_page,                 name="signup_page"),
    path("dashboard/",          dashboard_page,              name="dashboard_page"),
    path("compare/",            comparator_page,             name="comparator_page"),

    # ── Dashboard / Products API ──────────────
    path("api/dashboard/",      DashboardDataView.as_view(), name="dashboard_api"),
    path("api/products/",       ProductListCreateView.as_view(), name="product_list_create"),

    # ── Comparison Agent API ──────────────────
    path("api/compare/",        CompareAPIView.as_view(),    name="compare_api"),
    path("api/compare/image/",  CompareImageAPIView.as_view(), name="compare_image_api"),
]