import os
import requests
import json

# Read env
key = None
with open('.env', 'r') as f:
    for line in f:
        if 'VITE_TOMTOM_KEY' in line:
            key = line.split('=')[1].strip()

if not key:
    print("No key found")
    exit(1)

# Vijayawada BBox: 80.5,16.4, 80.7,16.6
bbox = "80.5,16.4,80.7,16.6"
url = f"https://api.tomtom.com/traffic/services/5/incidentDetails?key={key}&bbox={bbox}&fields={'{incidents{geometry{type,coordinates},properties{iconCategory}}}'}"
res = requests.get(url)
print(res.status_code)
print(res.text[:500])
