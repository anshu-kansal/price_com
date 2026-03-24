
import os
import sys
import django
import json
import requests
import base64

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings

def dump_lens_data(path):
    print(f"Reading: {path}")
    
    # Upload to Catbox
    print("Uploading to Catbox...")
    try:
        with open(path, 'rb') as f:
            cat_resp = requests.post(
                'https://catbox.moe/user/api.php',
                data={'reqtype': 'fileupload'},
                files={'fileToUpload': f},
                timeout=20
            )
        public_url = cat_resp.text.strip()
        print(f"Public URL: {public_url}")
    except Exception as e:
        print(f"Catbox failed: {e}")
        return

    # Query Lens
    print("Querying SerpAPI Lens...")
    SERPAPI_API_KEY = getattr(settings, 'SERPAPI_API_KEY', '') or os.environ.get('SERPAPI_API_KEY', '')
    params = {'engine': 'google_lens', 'url': public_url, 'api_key': SERPAPI_API_KEY}
    lens_resp = requests.get('https://serpapi.com/search.json', params=params, timeout=25)
    
    data = lens_resp.json()
    with open('lens_dump.json', 'w') as f:
        json.dump(data, f, indent=2)
    print("Dumped to lens_dump.json")

if __name__ == "__main__":
    dump_lens_data('./test_image.png')
