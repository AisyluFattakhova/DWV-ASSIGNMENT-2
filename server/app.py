from flask import Flask, request, jsonify, render_template
from flask_cors import CORS  # <-- add this
from datetime import datetime
import threading
import time
import requests
import os
from collections import Counter


app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)
# In-memory storage for packages
received_packages = []
suspicious_packages = []
app.template_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
@app.route('/')  # Add this route
def index():
    """Serve the main visualization page"""
    return render_template('index.html')

def geolocate_ip(ip):
    """Get latitude/longitude and location info from IP"""
    try:
        response = requests.get(f"http://ip-api.com/json/{ip}")
        data = response.json()
        if data['status'] == 'success':
            return {
                'country': data.get('country'),
                'city': data.get('city'),
                'lat': data.get('lat'),
                'lon': data.get('lon')
            }
    
    except Exception as e:
        print(f"[!] Geolocation error for {ip}: {e}")
    return {}

@app.route('/api/packages', methods=['POST'])
def receive_package():
    package = request.get_json()

    # Add server timestamp
    package['server_received_at'] = datetime.now().isoformat()

    # Normalize coordinate fields: remove existing lat/lon or latitude/longitude conflicts
    for key in ['lat', 'lon']:
        package.pop(key, None)
    for key in ['human_readable_time']:
        package.pop(key, None)

    # 🌍 Geolocate IP if IP exists
    ip = package.get('ip')
    if ip:
        location = geolocate_ip(ip)
        if location:
            package.update({
                'latitude': location.get('lat'),
                'longitude': location.get('lon'),
                'city': location.get('city'),
                'country': location.get('country')
            })

    # 💾 Store the package
    received_packages.append(package)

    # 🚩 Track suspicious ones separately
    if package.get('suspicious', 0) == 1:
        suspicious_packages.append(package)

    print(f"Received package from {ip} at {package['server_received_at']}")
    return jsonify({'status': 'success'}), 200



@app.route('/api/packages', methods=['GET'])
def get_packages():
    """Endpoint for frontend to retrieve packages"""
    # Count top 5 countries
    country_list = [pkg.get('country') for pkg in received_packages if pkg.get('country')]
    country_counter = Counter(country_list)
    top_countries = country_counter.most_common(5)

    return jsonify({
        'all_packages': received_packages,
        'suspicious_packages': suspicious_packages,
        'total_received': len(received_packages),
        'total_suspicious': len(suspicious_packages),
        'top_countries': top_countries,
        'last_received': received_packages[-1] if received_packages else None
    })
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)