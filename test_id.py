
import os
import sys
import django
import logging
import requests
import base64

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from apps.dashboard.views import _perform_visual_identification

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def diagnostic_test(path):
    print(f"\n--- DIAGNOSTIC START: {path} ---")
    
    # 1. Test Image Read
    try:
        with open(path, 'rb') as f:
            raw = f.read()
            print(f"Image read: {len(raw)} bytes")
            img_b64 = base64.b64encode(raw).decode('utf-8')
    except Exception as e:
        print(f"Image read FAILED: {e}")
        return

    # 2. Test Providers
    providers = [
        ('FreeImage', 'https://freeimage.host/api/1/upload', {'key': '6d207e02198a847aa98d0a2a901485a5', 'source': img_b64, 'format': 'json'}),
        ('ImgBB', 'https://api.imgbb.com/1/upload', {'key': '65239e94444586d11b33345426f8d02c', 'image': img_b64}),
    ]

    public_url = None
    for name, url, data in providers:
        print(f"Testing {name}...")
        try:
            resp = requests.post(url, data=data, timeout=15)
            print(f"{name} status: {resp.status_code}")
            if resp.status_code == 200:
                json_data = resp.json()
                if name == 'FreeImage':
                    public_url = json_data.get('image', {}).get('url')
                else:
                    public_url = json_data.get('data', {}).get('url')
                if public_url:
                    print(f"{name} SUCCESS: {public_url}")
                    break
        except Exception as e:
            print(f"{name} FAILED: {e}")

    if not public_url:
        print("All Upload Providers FAILED.")
    
    # 3. Test SerpAPI Lens
    SERPAPI_API_KEY = getattr(settings, 'SERPAPI_API_KEY', '') or os.getenv('SERPAPI_API_KEY', '')
    if public_url and SERPAPI_API_KEY:
        print("Testing SerpAPI Google Lens...")
        params = {
            'engine': 'google_lens',
            'url': public_url,
            'api_key': SERPAPI_API_KEY,
        }
        try:
            resp = requests.get('https://serpapi.com/search.json', params=params, timeout=20)
            print(f"SerpAPI Status: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                print(f"Lens Results keys: {list(data.keys())}")
            else:
                print(f"SerpAPI Error: {resp.text[:200]}")
        except Exception as e:
            print(f"SerpAPI FAILED: {e}")

    # 4. Test Tesseract
    print("Testing Tesseract OCR...")
    try:
        import pytesseract
        from PIL import Image
        img = Image.open(path)
        # Try to find tesseract_cmd from settings
        tesseract_path = getattr(settings, 'TESSERACT_CMD', None)
        if tesseract_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
        text = pytesseract.image_to_string(img)
        print(f"Tesseract Result: '{text.strip()[:100]}'")
    except Exception as e:
        print(f"Tesseract FAILED: {e}")

if __name__ == "__main__":
    # Use any image found earlier or a placeholder
    diagnostic_test('./test_image.png')
