import io
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''  // Live Feed Simulator
  useEffect(() => {
    if (!provider || !hazards.ready) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/live_traffic.json?t=' + Date.now());
        const data = await res.json();
        if (Array.isArray(data)) {
          for (const item of data) {
            // Check if we already have it by a custom note or rough coordinate match
            const exists = hazards.active.some(h => h.note === item.id);
            if (!exists) {
              provider.addHazard({
                type: item.type || "temporary_obstruction",
                severity: "high",
                lat: item.lat,
                lng: item.lng,
                note: item.id,
                reporterId: "live-sensor-system"
              });
            }
          }
        }
      } catch (e) {}
    }, 3000);
    return () => clearInterval(interval);
  }, [provider, hazards.ready, hazards.active]);'''

replacement = '''  // Autonomous TomTom Live Incident Ingestion
  useEffect(() => {
    if (!provider || !hazards.ready) return;
    const tomTomKey = import.meta.env.VITE_TOMTOM_KEY;
    if (!tomTomKey) return;

    const fetchLiveTraffic = async () => {
      try {
        const bbox = "80.5,16.4,80.7,16.6";
        const url = `https://api.tomtom.com/traffic/services/5/incidentDetails?key=${tomTomKey}&bbox=${bbox}&fields={incidents{geometry{type,coordinates},properties{iconCategory}}}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.incidents && Array.isArray(data.incidents)) {
          data.incidents.forEach((inc: any, i: number) => {
            const coords = inc.geometry?.coordinates;
            if (!coords || coords.length === 0) return;
            
            // Get center coordinate of the jam
            const mid = coords[Math.floor(coords.length / 2)];
            const lon = mid[0];
            const lat = mid[1];
            
            const cat = inc.properties?.iconCategory;
            let type: any = "temporary_obstruction";
            if (cat === 1) type = "accident";
            if (cat === 11) type = "waterlogging";
            if (cat === 9) type = "road_damage";

            const hazardId = `tomtom-live-${i}`;
            const exists = hazards.active.some(h => h.note === hazardId);
            
            if (!exists) {
              provider.addHazard({
                type,
                severity: "high",
                lat,
                lng,
                note: hazardId,
                reporterId: "tomtom-live-system"
              });
            }
          });
        }
      } catch (e) {
        console.error("Failed to fetch live traffic", e);
      }
    };

    // Fetch immediately, then every 60 seconds
    fetchLiveTraffic();
    const interval = setInterval(fetchLiveTraffic, 60000);
    return () => clearInterval(interval);
  }, [provider, hazards.ready, hazards.active]);'''

text = text.replace(target, replacement)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
