# Deployment Guide

## Backend

- Application root: `backend/`
- Django entrypoint: `backend/manage.py`
- Django settings: `backend/config/settings.py`
- Environment template: `backend/.env.example`

## Local development

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `DJANGO_DEBUG=True` for local usage.
3. Run:
```bash
cd backend
python manage.py migrate
python manage.py runserver
```

## Celery & Redis

- Redis is required for Celery and watchlist caching.
- Start worker with:
```bash
cd backend
celery -A config worker --loglevel=info
```

## Docker

- Build and run the application locally:
```bash
docker compose up --build
```

## Railway

- Railway deploys the backend from `backend/`.
- Use `Procfile` and `railway.json` for startup configuration.
- Required env vars include:
  - `SECRET_KEY`
  - `DATABASE_URL`
  - `REDIS_URL`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `EMAIL_HOST_USER`
  - `EMAIL_HOST_PASSWORD`
