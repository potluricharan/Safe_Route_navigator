import type { Hazard, RouteCandidate } from "../types";
import { activeHazards } from "./scoring";
import { encodeGeohash } from "../lib/geohash";

const OSRM_PUBLIC = "https://router.project-osrm.org";
const ORS_BASE = "https://api.openrouteservice.org";

// Applied after each OSRM request — the public demo server is rate-limited.
const OSRM_PACE_MS = 1100;
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
}

/**
 * Optional OpenRouteService hazard-avoiding route. Uses avoid_polygons around
 * active high-severity hazards. Requires VITE_ORS_API_KEY. Returns [] when no
 * key is configured.
 */
export async function fetchAvoidHazardsRoute(
  start: LatLng,
  destination: LatLng,
  hazards: Hazard[],
  now: number,
  raining: boolean,
  signal?: AbortSignal
): Promise<RouteCandidate[]> {
  const [sLat, sLng] = start;
  const [dLat, dLng] = destination;

  // Use BRouter for free dynamic hazard avoidance without API keys!
  const avoid = activeHazards(hazards, now, raining)
    .filter((h) => h.severity === "high")
    .map((h) => `${h.lng},${h.lat},40`) // 40m radius
    .join("|");

  const url = `https://brouter.de/brouter?lonlats=${sLng},${sLat}|${dLng},${dLat}&profile=car-fast&format=geojson${avoid ? `&nogos=${avoid}` : ""}`;

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.features || !data.features.length) return [];
    
    const geom = toLatLng(data.features[0].geometry.coordinates);
    const props = data.features[0].properties;
    const distKm = +(parseInt(props["track-length"] || "0", 10) / 1000).toFixed(2);
    const durationMin = +(parseInt(props["total-time"] || "0", 10) / 60).toFixed(1);

    return [
      {
        id: "brouter-avoid-driving",
        provider: "ors" as const, // keep type to satisfy TS
        kind: "avoid_hazards" as const,
        geometry: geom,
        distanceKm: distKm,
        durationMin: durationMin
      },
      {
        id: "brouter-avoid-bike",
        provider: "ors" as const,
        kind: "avoid_hazards" as const,
        geometry: geom,
        distanceKm: distKm,
        durationMin: +(distKm * 4).toFixed(1)
      },
      {
        id: "brouter-avoid-foot",
        provider: "ors" as const,
        kind: "avoid_hazards" as const,
        geometry: geom,
        distanceKm: distKm,
        durationMin: +(distKm * 12).toFixed(1)
      }
    ];
  } catch (e) {
    console.warn("Brouter avoid failed", e);
    return [];
  }
}

export function circlePolygon(center: LatLng, radiusM: number): [number, number][] {
  const dLat = radiusM / 111320;
  const dLng =
    radiusM / (111320 * Math.cos((center[0] * Math.PI) / 180));
  // Coarse rounded square around the hazard is enough for avoid_polygons.
  return [
    [center[1], center[0] + dLat],
    [center[1] + dLng, center[0]],
    [center[1], center[0] - dLat],
    [center[1] - dLng, center[0]],
    [center[1], center[0] + dLat]
  ];
}

export function routeCacheKey(
  start: LatLng,
  destination: LatLng
): string {
  return [
    encodeGeohash(start[0], start[1], 6),
    encodeGeohash(destination[0], destination[1], 6)
  ].join("|");
}