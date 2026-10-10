import io, re
with io.open('src/services/routing.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Add polyline decoder
decoder = '''function decodePolyline(encoded: string): [number, number][] {
  let index = 0, lat = 0, lng = 0;
  const poly: [number, number][] = [];
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    poly.push([lat / 1e5, lng / 1e5]);
  }
  return poly;
}'''

if 'decodePolyline' not in text:
    text = text.replace('function toLatLng', decoder + '\n\nfunction toLatLng')

# Replace fetchOSRMRoutes with fetchGoogleRoutes (keeping export name fetchOSRMRoutes so App.tsx doesn't break, or we rename it in both)
fetcher = '''export async function fetchOSRMRoutes(
  start: LatLng,
  destination: LatLng,
  opts: { alternatives?: number; signal?: AbortSignal } = {}
): Promise<RouteCandidate[]> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("VITE_GOOGLE_MAPS_API_KEY is missing!");
    return [];
  }

  const [sLat, sLng] = start;
  const [dLat, dLng] = destination;
  
  async function fetchMode(mode: "DRIVE" | "TWO_WHEELER" | "WALK") {
    const url = "https://routes.googleapis.com/directions/v2:computeRoutes";
    const body = {
      origin: { location: { latLng: { latitude: sLat, longitude: sLng } } },
      destination: { location: { latLng: { latitude: dLat, longitude: dLng } } },
      travelMode: mode,
      computeAlternativeRoutes: true
    };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline"
        },
        body: JSON.stringify(body),
        signal: opts.signal
      });
      if (!res.ok) throw new Error(Google HTTP );
      const data = await res.json();
      if (!data.routes) return [];
      
      const p = mode === "DRIVE" ? "driving" : mode === "TWO_WHEELER" ? "bike" : "foot";
      return data.routes.map((r: any, i: number) => {
        const durationSec = parseInt(r.duration || "0", 10);
        return {
          id: google--,
          provider: "osrm" as const, // keeping 'osrm' so we don't break types
          kind: "plain" as const,
          geometry: decodePolyline(r.polyline.encodedPolyline),
          distanceKm: +(r.distanceMeters / 1000).toFixed(2),
          durationMin: +(durationSec / 60).toFixed(1)
        };
      });
    } catch(e) {
      console.warn(Google  failed, e);
      return [];
    }
  }

  const [driving, bike, foot] = await Promise.all([
    fetchMode("DRIVE"),
    fetchMode("TWO_WHEELER"),
    fetchMode("WALK")
  ]);

  return [...driving, ...bike, ...foot];
}'''

# Replace the whole existing fetchOSRMRoutes
# The existing one starts at export async function fetchOSRMRoutes and ends at eturn [...footRoutes, ...drivingRoutes, ...bikeRoutes];\n}
old_fn_pattern = re.compile(r'export async function fetchOSRMRoutes.*?return \[\.\.\.footRoutes, \.\.\.drivingRoutes, \.\.\.bikeRoutes\];\n\}', re.DOTALL)
text = old_fn_pattern.sub(fetcher, text)

with io.open('src/services/routing.ts', 'w', encoding='utf-8') as f:
    f.write(text)
