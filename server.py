from flask import Flask, request, jsonify
from flask_cors import CORS  # <-- add this
from datetime import datetime
import threading
import time
import requests

app = Flask(__name__)
CORS(app)
# In-memory storage for packages
received_packages = []
suspicious_packages = []

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
    for key in ['lat', 'lon' ]:
        package.pop(key, None)
    for key in ['human_readable_time']:
        package.pop(key,None)

    # Geolocate IP if IP exists
    ip = package.get('ip')
    if ip:
        location = geolocate_ip(ip)
        # Add lat/lon and location info

    # Store
    received_packages.append(package)

    # Mark suspicious
    if package.get('suspicious', 0) == 1:
        suspicious_packages.append(package)

    print(f"Received package from {ip} at {package['server_received_at']}")
    return jsonify({'status': 'success'}), 200


@app.route('/api/packages', methods=['GET'])
def get_packages():
    """Endpoint for frontend to retrieve packages"""
    return jsonify({
        'all_packages': received_packages,
        'suspicious_packages': suspicious_packages,
        'total_received': len(received_packages),
        'last_received': received_packages[-1] if received_packages else None
    })

def start_server():
    """Run the Flask server"""
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)

if __name__ == '__main__':
    # Start server in a separate thread
    server_thread = threading.Thread(target=start_server)
    server_thread.daemon = True
    server_thread.start()
    
    # Keep main thread alive
    while True:
        time.sleep(1)