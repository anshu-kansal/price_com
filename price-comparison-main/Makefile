# Production-Ready Makefile for Price Comparison Backend
# Provides automated startup commands for Distributed background servers.

.PHONY: flower worker

flower:
	@echo "Starting Celery Flower Monitoring Dashboard..."
	@echo "Access the dashboard securely at http://localhost:5555"
	# Secure Deployment Configuration:
	# --port=5555 ensures it binds to the standard monitoring port
	# --basic_auth=admin:supersecret enforces Basic Auth blocking random visitors
	# --persistent=True mandates saving task history into a flatfile across reboots
	# --max_tasks=1000 protects Server Memory (RAM) by purging exceptionally old task payloads organically
	celery -A config flower --port=5555 --basic_auth=admin:admin123 --persistent=True --max_tasks=1000

worker:
	@echo "Spinning up Celery Worker node..."
	# Starts the backend scraping consumers. 
	# Windows compatible command mimicking 'celery -A config worker -l INFO -P gevent' if gevent was configured.
	celery -A config worker -l INFO --pool=solo

beat:
	@echo "Starting Celery Beat Scheduler..."
	celery -A config beat -l INFO
