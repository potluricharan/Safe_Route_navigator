import io, re
with io.open('src/components/MapView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''      // Safe Places
      if (props.showSafePlaces && props.safePlacesList) {
        props.safePlacesList.forEach((poi: any) => {
           const lat = poi.lat ?? poi.center?.lat;
           const lon = poi.lon ?? poi.center?.lon;
           const origin = props.start || props.mapCenter;
           const d = Math.sqrt(Math.pow(lat - origin[0], 2) + Math.pow(lon - origin[1], 2));
           const distM = Math.round(d * 111320);
           
           const name = poi.tags?.name || 'Police Station';
           const phone = poi.tags?.phone || poi.tags?.['contact:phone'] || '100';'''

replacement = '''      // Safe Places
      if (props.showSafePlaces && props.safePlacesList) {
        let activeRouteGeometry: [number, number][] = [];
        if (props.routes && props.routes.length > 0) {
           const activeRoute = props.routes.find(r => r.route.id === props.selectedRouteId) || props.routes[0];
           if (activeRoute) activeRouteGeometry = activeRoute.route.geometry;
        }

        props.safePlacesList.forEach((poi: any) => {
           const lat = poi.lat ?? poi.center?.lat;
           const lon = poi.lon ?? poi.center?.lon;
           
           if (activeRouteGeometry.length > 0) {
               let minRouteDist = Infinity;
               for (const pt of activeRouteGeometry) {
                   const d = Math.sqrt(Math.pow(lat - pt[0], 2) + Math.pow(lon - pt[1], 2));
                   if (d < minRouteDist) minRouteDist = d;
                   if (minRouteDist * 111320 < 400) break;
               }
               if (minRouteDist * 111320 > 400) return;
           }

           const origin = props.start || props.mapCenter;
           const d = Math.sqrt(Math.pow(lat - origin[0], 2) + Math.pow(lon - origin[1], 2));
           const distM = Math.round(d * 111320);
           
           let typeStr = "Safe Zone";
           if (poi.tags?.amenity === "police") typeStr = "Police Station";
           else if (poi.tags?.amenity === "hospital") typeStr = "Hospital";
           else if (poi.tags?.amenity === "university") typeStr = "Campus Security";
           else if (poi.tags?.tourism === "hostel" || poi.tags?.accommodation === "hostel") typeStr = "Women's Hostel";
           else if (poi.tags?.shop) typeStr = "24/7 Safe Shop";

           const name = poi.tags?.name || typeStr;
           const phone = poi.tags?.phone || poi.tags?.['contact:phone'] || '100';'''

text = text.replace(target, replacement)

with io.open('src/components/MapView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
