import io
with io.open('src/services/routing.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# I will just write out the complete previous OSRM fetch function.
osrm_fetcher = """const OSRM_PACE_MS = 1100;
let osrmLastCall = 0;

function osrmProfile(profile: "foot" | "driving") {
  return `https://router.project-osrm.org/route/v1/${profile}`;
}

type LatLng = [number, number];

function toLatLng(coords: [number, number][]): LatLng[] {
  return coords.map(([lng, lat]) => [lat, lng]);
}

export async function fetchOSRMRoutes(
  start: LatLng,
  destination: LatLng,
  opts: { alternatives?: number; signal?: AbortSignal } = {}
): Promise<RouteCandidate[]> {
  const [sLat, sLng] = start;
  const [dLat, dLng] = destination;
  const coords = `${sLng},${sLat};${dLng},${dLat}`;
  const url = `${osrmProfile("foot")}/${coords}?alternatives=${opts.alternatives ?? 2}&overview=full&geometries=geojson&steps=false`;

  const wait = () =>
    new Promise<void>((r) =>
      setTimeout(r, Math.max(0, OSRM_PACE_MS - (Date.now() - osrmLastCall)))
    );

  async function attempt(profile: "foot" | "driving" | "bike") {
    await wait();
    osrmLastCall = Date.now();
    
    // Always fetch driving from OSRM to get the geometry because OSRM public foot/bike geometries are identical anyway
    const fetchProfile = "driving"; 
    
    const res = await fetch(`https://router.project-osrm.org/route/v1/${fetchProfile}/${coords}?alternatives=${opts.alternatives ?? 2}&overview=full&geometries=geojson&steps=false`, {
      signal: opts.signal
    });
    
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
    const data = (await res.json()) as any;
    
    if (data.code !== "Ok" || !data.routes?.length) return [];
    
    return data.routes.map((r: any, i: number) => {
      const distKm = +(r.distance / 1000).toFixed(2);
      let calcDurationMin = r.duration / 60;
      if (profile === "foot") calcDurationMin = distKm * 12;
      else if (profile === "bike") calcDurationMin = distKm * 4;
      
      return {
        id: `osrm-${profile}-${i}`,
        provider: "osrm" as const,
        kind: "plain" as const,
        geometry: toLatLng(r.geometry.coordinates),
        distanceKm: distKm,
        durationMin: +calcDurationMin.toFixed(1)
      };
    });
  }

  let footRoutes: RouteCandidate[] = [];
  let drivingRoutes: RouteCandidate[] = [];
  let bikeRoutes: RouteCandidate[] = [];
  
  try {
    drivingRoutes = await attempt("driving");
    // Since geometry is identical, we can derive them locally instead of making 3 API calls!
    footRoutes = drivingRoutes.map(r => ({ ...r, id: r.id.replace("driving", "foot"), durationMin: +(r.distanceKm * 12).toFixed(1) }));
    bikeRoutes = drivingRoutes.map(r => ({ ...r, id: r.id.replace("driving", "bike"), durationMin: +(r.distanceKm * 4).toFixed(1) }));
  } catch {
    // Ignore failure
  }
  
  return [...footRoutes, ...drivingRoutes, ...bikeRoutes];
}"""

import re
# We need to find everything from 'const OSRM_PACE_MS' up to the end of 'fetchOSRMRoutes'
start_idx = text.find('const OSRM_PACE_MS')
end_idx = text.find('/**\n * Optional OpenRouteService')

text = text[:start_idx] + osrm_fetcher + '\n\n' + text[end_idx:]

# Remove decodePolyline
text = re.sub(r'function decodePolyline.*?return poly;\n}\n+', '', text, flags=re.DOTALL)

with io.open('src/services/routing.ts', 'w', encoding='utf-8') as f:
    f.write(text)
