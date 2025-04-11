import csv
import json
import time
from datetime import datetime
import requests
import sys

def send_packages(csv_file):
    """Read CSV and send packages respecting timestamps"""
    with open(csv_file, 'r') as file:
        reader = csv.DictReader(file)
        previous_timestamp = None
        
        for row in reader:
            # Prepare package data
            package = {
                'ip': row['ip address'],
                'latitude': float(row['Latitude']),
                'longitude': float(row['Longitude']),
                'timestamp': row['Timestamp'],
                'suspicious': int(float(row['suspicious']))
            }
            
            # Convert Unix timestamp to datetime
            try:
                unix_timestamp = int(row['Timestamp'])
                current_time = datetime.fromtimestamp(unix_timestamp)
                package['human_readable_time'] = current_time.strftime('%Y-%m-%d %H:%M:%S')
            except ValueError:
                print(f"Invalid timestamp format: {row['timestamp']}")
                continue
            
            # Calculate delay if this isn't the first package
            if previous_timestamp is not None:
                delay = unix_timestamp - previous_timestamp
                if delay > 0:
                    print(f"Waiting {delay} seconds before next package...")
                    time.sleep(delay)
            
            # Send package
            try:
                response = requests.post(
                    'http://localhost:5000/api/packages',
                    json=package,
                    headers={'Content-Type': 'application/json'}
                )
                print(f"Sent package from {package['ip']} - Status: {response.status_code}")
            except requests.exceptions.RequestException as e:
                print(f"Failed to send package: {str(e)}")
            
            previous_timestamp = unix_timestamp

if __name__ == '__main__':

    csv_file = "ip_addresses.csv"
    print(f"Starting to send packages from {csv_file}...")
    send_packages(csv_file)