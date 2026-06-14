web: cd backend && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
worker: cd backend && celery -A config worker --loglevel=info
