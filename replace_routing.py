import io
with io.open('src/services/routing.ts', 'r', encoding='utf-8') as f:
    text = f.read()

decoder = """function decodePolyline(encoded: string): [number, number][] {
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
}

"""

google_fetcher = """export async function fetchOSRMRoutes(
  start: LatLng,
  destination: LatLng,
  opts: { alternatives?: number; signal?: AbortSignal } = {}
): Promise<RouteCandidate[]> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("VITE_GOOGLE_MAPS_API_KEY is missing! Google Routes API requires a key.");
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
      if (!res.ok) throw new Error(`Google HTTP ${res.status}`);
      const data = await res.json();
      if (!data.routes) return [];
      
      const p = mode === "DRIVE" ? "driving" : mode === "TWO_WHEELER" ? "bike" : "foot";
      return data.routes.map((r: any, i: number) => {
        const durationSec = parseInt(r.duration || "0", 10);
        return {
          id: `osrm-${p}-${i}`,
          provider: "osrm" as const,
          kind: "plain" as const,
          geometry: decodePolyline(r.polyline.encodedPolyline),
          distanceKm: +(r.distanceMeters / 1000).toFixed(2),
          durationMin: +(durationSec / 60).toFixed(1)
        };
      });
    } catch(e) {
      console.warn(`Google ${mode} failed`, e);
      return [];
    }
  }

  const [driving, bike, foot] = await Promise.all([
    fetchMode("DRIVE"),
    fetchMode("TWO_WHEELER"),
    fetchMode("WALK")
  ]);

  return [...driving, ...bike, ...foot];
}"""

start_idx = text.find('export async function fetchOSRMRoutes')
end_idx = text.find('/**\n * Optional OpenRouteService')
text = text[:start_idx] + google_fetcher + '\n\n' + text[end_idx:]

text = text.replace('function toLatLng', decoder + 'function toLatLng')

with io.open('src/services/routing.ts', 'w', encoding='utf-8') as f:
    f.write(text)
