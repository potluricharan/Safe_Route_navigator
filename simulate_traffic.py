import time
import json
import os

coords = [
    {"id": "live-jam-1", "lat": 16.512, "lng": 80.621},
    {"id": "live-jam-2", "lat": 16.514, "lng": 80.625},
    {"id": "live-jam-3", "lat": 16.517, "lng": 80.628}
]

print("Starting Live Traffic Simulation...")
print("Make sure your browser is open and you are looking at the map!")

# Clear the file first
with open("public/live_traffic.json", "w") as f:
    json.dump([], f)

current_jams = []

for c in coords:
    time.sleep(5)
    current_jams.append(c)
    with open("public/live_traffic.json", "w") as f:
        json.dump(current_jams, f)
    print(f"--> Pushed live traffic sensor data at: {c['lat']}, {c['lng']}")

print("Simulation complete! You should see 3 new hazards on your map.")
