import sys
import socket
import urllib.request
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def check_django() -> bool:
    try:
        # Check if port 8000 is accepting connections
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('127.0.0.1', 8000))
        sock.close()
        
        if result == 0:
            logging.info("[SUCCESS] Django is running on port 8000.")
            try:
                # Ping Health Endpoint
                response = urllib.request.urlopen("http://127.0.0.1:8000/api/health/")
                if response.getcode() == 200:
                    logging.info("[SUCCESS] Django /api/health/ endpoint is responding actively.")
                    return True
            except:
                logging.warning("[WARNING] Port 8000 is open, but API Health endpoint not resolving 200 OK.")
        else:
            logging.error("[FAILURE] Django is NOT running on port 8000.")
    except Exception as e:
        logging.error(f"[FAILURE] Django check crashed: {e}")
    return False

def check_redis() -> bool:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('127.0.0.1', 6379))
        sock.close()
        if result == 0:
            logging.info("[SUCCESS] Redis Broker is running on port 6379.")
            return True
        else:
            logging.error("[FAILURE] Redis Broker is NOT running on port 6379.")
    except Exception as e:
        logging.error(f"[FAILURE] Redis check crashed: {e}")
    return False

def check_celery() -> bool:
    try:
        # Pinging Celery Worker requires running via shell, let's just check the process list
        import subprocess
        result = subprocess.run(['celery', '-A', 'config', 'status'], capture_output=True, text=True)
        if "OK" in result.stdout:
            logging.info("[SUCCESS] Celery Worker is ONLINE and accepting tasks.")
            return True
        else:
            logging.warning("[WARNING] Celery might be offline or requiring task resolution. Use `celery -A config worker -l info`.")
    except Exception as e:
        logging.warning("[WARNING] Celery status check failed. Ensure Celery is installed and path is accessible.")
    return False

if __name__ == "__main__":
    print("\n" + "="*50)
    print("   PRICE COMPARISON - SYSTEM HEALTH CHECK")
    print("="*50 + "\n")
    
    django_ok = check_django()
    redis_ok = check_redis()
    celery_ok = check_celery()
    
    print("\n" + "="*50)
    if django_ok and redis_ok:
        print(" => SYSTEM STATUS: OPERATIONAL")
        print(" => The Bridge between React (Fetch/XHR) and Django is active.")
    else:
        print(" => SYSTEM STATUS: CRITICAL FAILURE")
        print(" => Please start the missing services.")
    print("="*50 + "\n")
