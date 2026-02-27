"""
For the full list of settings and their values, see
https://docs.djangoproject.com/en/6.0/ref/settings/
"""

from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
import os
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = "django-insecure-+-o4_ds207u&&=s0l)($@9*3-gk698n7qqf5(fu4&f4phn83w@"

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ["*"]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),   # used to access different routes
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),       # expires in one day
}


# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "product_comparison",       # existing app
    "bubble",               # ← Bubble app for product comparison
    "rest_framework",
    "corsheaders",
    "django.contrib.sites",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",            # must be before CommonMiddleware
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates", BASE_DIR / "product_comparison" / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME"),
        "USER": os.getenv("DB_USER"),
        "PASSWORD": os.getenv("DB_PASSWORD"),
        "HOST": os.getenv("DB_HOST"),
        "PORT": os.getenv("DB_PORT"),
    }
}


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# Static files
STATIC_URL = "static/"
STATICFILES_DIRS = [BASE_DIR / "product_comparison" / "static"]

# Media files (product images uploaded by users)
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

SITE_ID = 1

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ─────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True


# ─────────────────────────────────────────────
# AUTHENTICATION
# ─────────────────────────────────────────────
AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "APP": {
            "client_id": "557529870312-q1i3a68dq3j2nksuldnki0v3a4dnlsnh.apps.googleusercontent.com",
            "secret": "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",
            "key": "",
        }
    }
}

LOGIN_URL = "login"
LOGOUT_URL = "logout"
LOGIN_REDIRECT_URL = "dashboard_page"
ACCOUNT_LOGOUT_REDIRECT_URL = "login_page"
SOCIALACCOUNT_LOGIN_ON_GET = True


# ─────────────────────────────────────────────
# PRODUCT COMPARISON BUBBLE AGENT
# ─────────────────────────────────────────────

# Tavily API key — used to discover products on external marketplaces.
# Get one free at https://tavily.com
# Set via environment variable: export TAVILY_API_KEY="your_key_here"
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")

# Anthropic key — required only if you enable Claude Vision for image input.
# Set via environment variable: export ANTHROPIC_API_KEY="your_key_here"
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# OpenRouter key — required for Qwen VL for image analysis
# Set via environment variable: export OPENROUTER_API_KEY="your_key_here"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

# Marketplaces the agent will search for price comparison.
# Add or remove entries freely; each needs a display name and domain.
TARGET_MARKETPLACES = [
    {"name": "Amazon India",     "domain": "amazon.in"},
    {"name": "Flipkart",         "domain": "flipkart.com"},
    {"name": "Croma",            "domain": "croma.com"},
    {"name": "Reliance Digital", "domain": "reliancedigital.in"},
]

# HTTP request timeout (seconds) when scraping product pages.
REQUEST_TIMEOUT = 10

# Minimum similarity score (0–1) required to accept a marketplace result.
# Results below this threshold are discarded to prevent wrong comparisons.
MIN_MATCH_SCORE = 0.8