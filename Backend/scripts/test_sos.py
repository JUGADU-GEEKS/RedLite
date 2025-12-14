import sys
import json
import time
import uuid
import requests


def main():
    url = 'http://localhost:8000/sos/send'
    payload = {
        "userId": str(uuid.uuid4()),
        "userName": "Local Test User",
        "phone": "+919876543210",
        "vehicle": "car",
        # Coordinates near the configured traffic lights in the project
        "latitude": 28.612091,
        "longitude": 77.037639
    }

    print(f"[test_sos] Posting to {url} with payload:\n{json.dumps(payload, indent=2)}")
    try:
        resp = requests.post(url, json=payload, timeout=10)
    except Exception as e:
        print(f"[test_sos] Request failed: {e}")
        sys.exit(2)

    print(f"[test_sos] Response status: {resp.status_code}")
    try:
        data = resp.json()
        print(json.dumps(data, indent=2))
    except Exception:
        print("[test_sos] Response not JSON:")
        print(resp.text)


if __name__ == '__main__':
    main()
#!/usr/bin/env python3
"""Simple test script to POST a test SOS payload to the local backend.

Usage:
  python scripts/test_sos.py

Adjust `BASE` if your backend runs on a different host/port.
"""
import json
import sys
import requests

BASE = 'http://localhost:8000'
URL = f"{BASE}/sos/send"

payload = {
    "userId": "test-user-1",
    "userName": "Test User",
    "phone": "+911234567890",
    "vehicle": "TestCar-123",
    "latitude": 28.612091,
    "longitude": 77.037639
}

def main():
    print(f"Posting to {URL} ...")
    try:
        r = requests.post(URL, json=payload, timeout=10)
        print("Status:", r.status_code)
        try:
            print(json.dumps(r.json(), indent=2))
        except Exception:
            print(r.text)
    except Exception as e:
        print('Request failed:', e)

if __name__ == '__main__':
    main()
