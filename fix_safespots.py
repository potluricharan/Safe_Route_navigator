import io, re

with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update Overpass Query
new_query = '''const query = [out:json][timeout:25];(nwr["amenity"="police"](16.48,80.60,16.55,80.68);nwr["amenity"="hospital"](16.48,80.60,16.55,80.68);nwr["shop"]["opening_hours"~"24/7"](16.48,80.60,16.55,80.68););out center;;'''
text = re.sub(r'const query = \[out:json\]\[timeout:25\];\(nwr\["amenity"="police"\].*?;;', new_query, text)

# 2. Update distance logic and modal logic
new_handler = '''const handleNearestSafePlace = () => {
    if (safePlacesList.length === 0) {
       alert("Still loading safe places from map data...");
       return;
    }
    const origin = start || contextPoint;
    let closest = safePlacesList[0];
    let minDist = Infinity;
    safePlacesList.forEach(p => {
       const d = Math.sqrt(Math.pow((p.lat ?? p.center?.lat) - origin[0], 2) + Math.pow((p.lon ?? p.center?.lon) - origin[1], 2));
       if (d < minDist) { minDist = d; closest = p; }
    });
    
    const distMeters = Math.round(minDist * 111320);
    const isPolice = closest.tags?.amenity === "police";
    const typeStr = isPolice ? "Police Station" : (closest.tags?.amenity === "hospital" ? "Hospital" : "24/7 Safe Shop");
    const name = closest.tags?.name || "Safe Zone";
    
    setSosPlace({ place: closest, distMeters, typeStr, name });
  };'''
text = re.sub(r'const handleNearestSafePlace = \(\) => \{.*?setSosPlace\(\{ place: closest, distMeters, typeStr, name \}\);\n  \};', new_handler, text, flags=re.DOTALL)

# 3. Update the button text
text = re.sub(r'\u26d3 Nearest Police Station', '\U0001f6e1\uFE0F Nearest Safe Place', text)
text = re.sub(r'\u26d3 Nearest Police Station', '\U0001f6e1\uFE0F Nearest Safe Place', text)
# (Actually previous was 1f693)
text = text.replace('\U0001f693 Nearest Police Station', '\U0001f6e1\uFE0F Nearest Safe Place')

# 4. Update the Modal content
modal_old = '''<h2 style={{ margin: "0 0 8px 0", color: "#f8fafc" }}>Nearest Police Station</h2>
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', margin: '16px 0' }}>
                 <div style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '18px', marginBottom: '4px' }}>{sosPlace.typeStr}</div>
                 <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>{sosPlace.name}</div>
                 <div style={{ color: '#94a3b8' }}>Only <strong style={{ color: '#10b981' }}>{sosPlace.distMeters}m</strong> away from your location.</div>
              </div>
              <p style={{ color: '#cbd5e1', marginBottom: '24px', fontSize: '14px' }}>Would you like to dial emergency services immediately?</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                 <button style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #475569', background: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setSosPlace(null)}>Cancel</button>
                 <button style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)' }} onClick={() => { window.location.href = "tel:100"; setSosPlace(null); }}>\U0001f4de Dial 100 Now</button>
              </div>'''

modal_new = '''<h2 style={{ margin: "0 0 8px 0", color: "#f8fafc" }}>Nearest Safe Place</h2>
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', margin: '16px 0' }}>
                 <div style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '18px', marginBottom: '4px' }}>{sosPlace.typeStr}</div>
                 <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>{sosPlace.name}</div>
                 <div style={{ color: '#94a3b8' }}>Only <strong style={{ color: '#10b981' }}>{sosPlace.distMeters}m</strong> away from your location.</div>
              </div>
              <p style={{ color: '#cbd5e1', marginBottom: '24px', fontSize: '14px' }}>Would you like to reroute here for immediate safety?</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                 <button style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #475569', background: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setSosPlace(null)}>Cancel</button>
                 <button style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', background: '#22c55e', color: 'white', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(34, 197, 94, 0.3)' }} onClick={() => { 
                    setDestination([sosPlace.place.lat ?? sosPlace.place.center?.lat, sosPlace.place.lon ?? sosPlace.place.center?.lon]);
                    setSosPlace(null);
                 }}>\U0001f9ed Route Here</button>
              </div>'''

text = text.replace(modal_old, modal_new)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
