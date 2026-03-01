from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-change-this-in-production'
DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1']

# Google OAuth - Replace with your actual client ID
GOOGLE_CLIENT_ID = '456375997142-16vs1sp1hfate2apnps3v10jjluj370p.apps.googleusercontent.com'
GOOGLE_CLIENT_SECRET = '****2eZF'  # Add this

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
     'django_extensions',
    'corsheaders',
    'backend',
    'users',
    'password_reset',
    'products',
    'django_celery_results',
    'django_celery_beat',
]
AUTH_USER_MODEL = 'users.User'
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Absolute top for API Security bridge
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

# IMPORTANT: Add this TEMPLATES configuration
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS settings
CORS_ALLOW_ALL_ORIGINS = True  # Explicitly enabled to bypass frontend blocking
CORS_ALLOW_CREDENTIALS = True  # Ensure polling requests aren't rejected due to missing tokens
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
]

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
# settings.py - Email Configuration
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = '239y1a0541@ksrmce.ac.in'  # Replace with your Gmail
EMAIL_HOST_PASSWORD = '239y1a0541@ksrmce.ac.in'  # Replace with your Gmail App Password
DEFAULT_FROM_EMAIL = '239y1a0541@ksrmce.ac.in'
# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
}

# Celery & Redis Infrastructure Configuration
CELERY_BROKER_URL = 'redis://127.0.0.1:6379/0'
# Distributed Systems Link: Force Results into Redis (not local sqlite Django DB) for Instant Async I/O
CELERY_RESULT_BACKEND = 'redis://127.0.0.1:6379/0' 
CELERY_CACHE_BACKEND = 'django-cache'

CELERY_ACCEPT_CONTENT = ['application/json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Advanced Concurrency & Rate Limiting (Celery Settings)
CELERY_WORKER_CONCURRENCY = 2
CELERY_WORKER_PREFETCH_MULTIPLIER = 1 # Distributed evenly, preventing bottlenecking

# Server Protection: Memory Shield Timeouts
CELERY_TASK_TIME_LIMIT = 90  # Hard kill any zombie task exceeding 90 seconds
CELERY_TASK_SOFT_TIME_LIMIT = 60  # Raise SoftTimeLimitExceeded exception at 60 seconds

# Result Cleanup
CELERY_RESULT_EXPIRES = 86400  # TTL (Time-To-Live) config: 24 hours to prevent DB blooming

# Core Automation Logic (Celery Beat Configuration)
from celery.schedules import crontab
CELERY_BEAT_SCHEDULE = {
    'nightly-price-tracker': {
        'task': 'products.tasks.update_all_product_prices_task',
        'schedule': crontab(hour=2, minute=0), # Low-traffic execution slot
    },
}
