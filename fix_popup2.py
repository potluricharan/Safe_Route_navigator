import io

with io.open('src/components/MapView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_block = '''      props.safePlacesList.forEach((poi: any) => {
         const icon = L.divIcon({
            className: "custom-safe-poi",
            html: <div style="background:#3b82f6;border-radius:50%;padding:4px;border:2px solid white;box-shadow:0 0 10px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:12px;">\U0001f6e1\uFE0F</span></div>,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
         });
         L.marker([(poi.lat ?? poi.center?.lat), (poi.lon ?? poi.center?.lon)], { icon }).bindPopup(<b></b><br/>).addTo(layerGroup);
      });'''

new_block = '''      props.safePlacesList.forEach((poi: any) => {
         const lat = poi.lat ?? poi.center?.lat;
         const lon = poi.lon ?? poi.center?.lon;
         const origin = props.start || props.mapCenter;
         const d = Math.sqrt(Math.pow(lat - origin[0], 2) + Math.pow(lon - origin[1], 2));
         const distM = Math.round(d * 111320);
         
         const name = poi.tags?.name || 'Police Station';
         const phone = poi.tags?.phone || poi.tags?.['contact:phone'] || '100';
         
         const icon = L.divIcon({
            className: "custom-safe-poi",
            html: <div style="background:#3b82f6;border-radius:50%;padding:4px;border:2px solid white;box-shadow:0 0 10px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:12px;">\U0001f6e1\uFE0F</span></div>,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
         });
         L.marker([lat, lon], { icon }).bindPopup(<div style="text-align:center;min-width:120px;"><b style="font-size:14px;color:#0f172a;">\</b><br/><span style="color:#10b981;font-weight:bold;">\m away</span><br/><a href="tel:\" style="text-decoration:none;"><div style="margin-top:6px;background:#ef4444;color:white;padding:4px 8px;border-radius:4px;font-weight:bold;display:inline-block;">\U0001f4de \</div></a></div>).addTo(layerGroup);
      });'''

import re
text = re.sub(r'props\.safePlacesList\.forEach\(\(poi: any\) => \{.*?\addTo\(layerGroup\);\s*\}\);', new_block, text, flags=re.DOTALL)

with io.open('src/components/MapView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
