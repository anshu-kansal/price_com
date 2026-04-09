import socket
import os
from dotenv import load_dotenv

load_dotenv()

def check_mysql():
    host = os.getenv('DB_HOST', '127.0.0.1')
    port = int(os.getenv('DB_PORT', 3306))
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(2)
    try:
        s.connect((host, port))
        print(f"MySQL is reachable on {host}:{port}")
        return True
    except Exception as e:
        print(f"MySQL is NOT reachable: {e}")
        return False
    finally:
        s.close()

if __name__ == "__main__":
    check_mysql()
