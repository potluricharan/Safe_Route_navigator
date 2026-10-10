import io, re
with io.open('src/components/MapView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

new_logic = '''    // Safe Places
    if (props.showSafePlaces && props.safePlacesList) {
      let activeRouteGeometry: [number, number][] = [];
      if (props.routes && props.routes.length > 0) {
         const activeRoute = props.routes.find(r => r.route.id === props.selectedRouteId) || props.routes[0];
         if (activeRoute) activeRouteGeometry = activeRoute.route.geometry;
      }
      
      props.safePlacesList.forEach((poi: any) => {
         const lat = poi.lat ?? poi.center?.lat;
         const lon = poi.lon ?? poi.center?.lon;
         
         // If there's an active route, only show POIs within ~400m of the path
         if (activeRouteGeometry.length > 0) {
             let minRouteDist = Infinity;
             for (const pt of activeRouteGeometry) {
                 const d = Math.sqrt(Math.pow(lat - pt[0], 2) + Math.pow(lon - pt[1], 2));
                 if (d < minRouteDist) minRouteDist = d;
                 if (minRouteDist * 111320 < 400) break; // early exit if close enough
             }
             if (minRouteDist * 111320 > 400) return; // skip rendering
         }
         
         const origin = props.start || props.mapCenter;
         const distToUser = Math.round(Math.sqrt(Math.pow(lat - origin[0], 2) + Math.pow(lon - origin[1], 2)) * 111320);
         
         const isPolice = poi.tags?.amenity === 'police';
         let typeStr = "Safe Zone";
         if (poi.tags?.amenity === "police") typeStr = "Police Station";
         else if (poi.tags?.amenity === "hospital") typeStr = "Hospital";
         else if (poi.tags?.amenity === "university") typeStr = "Campus Security";
         else if (poi.tags?.tourism === "hostel" || poi.tags?.accommodation === "hostel") typeStr = "Women's Hostel";
         else if (poi.tags?.shop) typeStr = "24/7 Safe Shop";

         const name = poi.tags?.name || typeStr;
         const phone = poi.tags?.phone || poi.tags?.['contact:phone'] || '100';'''

text = re.sub(r'// Safe Places\s+if \(props\.showSafePlaces && props\.safePlacesList\) \{\s+props\.safePlacesList\.forEach\(\(poi: any\) => \{\s+const lat = poi\.lat \?\? poi\.center\?\.lat;\s+const lon = poi\.lon \?\? poi\.center\?\.lon;\s+const origin = props\.start \|\| props\.mapCenter;\s+const d = Math\.sqrt\(Math\.pow\(lat - origin\[0\], 2\) \+ Math\.pow\(lon - origin\[1\], 2\)\);\s+const distM = Math\.round\(d \* 111320\);\s+const name = poi\.tags\?\.name \|\| \'Police Station\';\s+const phone = poi\.tags\?\.phone \|\| poi\.tags\?\.\['contact:phone'\] \|\| \'100\';', new_logic, text, flags=re.DOTALL)

with io.open('src/components/MapView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
