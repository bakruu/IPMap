import requests

import time

class GeoIP:
    def __init__(self):
        self.cache = {}
        self.api_url = "http://ip-api.com/json/{}"
        self.last_request_time = 0
        self.request_interval = 1.5 # Seconds between requests (40 requests/minute)

    def get_location(self, ip):
        if ip in self.cache:
            return self.cache[ip]

        current_time = time.time()
        if current_time - self.last_request_time < self.request_interval:
            # Rate limit hit, return None for now (or could return a "pending" status)
            return None

        try:
            self.last_request_time = current_time
            response = requests.get(self.api_url.format(ip), timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data['status'] == 'success':
                    result = {
                        'ip': ip,
                        'country': data.get('country', 'Unknown'),
                        'countryCode': data.get('countryCode', 'XX'),
                        'lat': data.get('lat', 0),
                        'lon': data.get('lon', 0),
                        'city': data.get('city', 'Unknown'),
                        'isp': data.get('isp', 'Unknown')
                    }
                    self.cache[ip] = result
                    return result
        except Exception as e:
            print(f"Error fetching GeoIP for {ip}: {e}")
        
        return None
