import os
import requests
import json
import time

def get_key():
    try:
        with open('.env', 'r') as f:
            for line in f:
                if 'VITE_TOMTOM_KEY' in line:
                    return line.split('=')[1].strip()
    except:
        pass
    return None

def map_icon_to_type(icon_category):
    # TomTom Icon Categories:
    # 1: Accident, 6: Jam, 8: Road Closed, 9: Road Works, 11: Flooding
    if icon_category == 1: return "accident"
    if icon_category == 11: return "waterlogging"
    if icon_category == 9: return "road_damage"
    return "temporary_obstruction" # Default for Jams and Road Closures

def fetch_live_data():
    key = get_key()
    if not key:
        print("ERROR: VITE_TOMTOM_KEY not found in .env")
        return

    # Bounding box around Vijayawada
    bbox = "80.5,16.4,80.7,16.6"
    url = f"https://api.tomtom.com/traffic/services/5/incidentDetails?key={key}&bbox={bbox}&fields={'{incidents{geometry{type,coordinates},properties{iconCategory}}}'}"
    
    print("Fetching live traffic incidents from TomTom API...")
    res = requests.get(url)
    if res.status_code != 200:
        print(f"Failed to fetch data: {res.status_code}")
        return

    data = res.json()
    incidents = data.get("incidents", [])
    
    hazards = []
    for i, inc in enumerate(incidents):
        props = inc.get("properties", {})
        geom = inc.get("geometry", {})
        
        # Get the first coordinate of the line string as the pin location
        coords = geom.get("coordinates", [])
        if not coords: continue
        
        lon, lat = coords[len(coords)//2] # Middle of the jam
        
        hazards.append({
            "id": f"tomtom-live-{i}",
            "lat": lat,
            "lng": lon,
            "type": map_icon_to_type(props.get("iconCategory", 6))
        })

    print(f"Found {len(hazards)} real-world incidents in Vijayawada right now!")
    
    with open("public/live_traffic.json", "w") as f:
        json.dump(hazards, f)
    
    print("Injected into live_traffic.json! The React app will pick it up in 3 seconds.")

if __name__ == "__main__":
    fetch_live_data()
