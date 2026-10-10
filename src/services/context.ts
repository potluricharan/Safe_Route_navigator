import type { StaticFeature } from "../types";
import { encodeGeohash } from "../lib/geohash";

const OVERPASS = "https://overpass-api.de/api/interpreter";
const CACHE_NS = "srn_static_v1";
const CACHE_TTL_MS = 24 * 3600 * 1000;

interface CacheEntry {
  key: string;
  features: StaticFeature[];
  fetchedAt: number;
}

/** Cache a viewport's worth of OSM context in localStorage (24h TTL). */
export async function fetchStaticFeatures(
  bbox: { minLat: number; minLng: number; maxLat: number; maxLng: number }
): Promise<StaticFeature[]> {
  const cacheKey = [
    encodeGeohash(bbox.minLat, bbox.minLng, 5),
    encodeGeohash(bbox.maxLat, bbox.maxLng, 5)
  ].join("-");

  try {
    const cached = readCache(cacheKey);
    if (cached) return cached;
  } catch {
    /* cache unavailable - continue */
  }

  const query = `[out:json][timeout:12];
(
  node["highway"="street_lamp"](${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng});
  way["highway"](${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng});
);
out center tags;`;

  try {
    const res = await fetch(OVERPASS, {
      method: "POST",
      body: "data=" + encodeURIComponent(query),
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
    const data = (await res.json()) as {
      elements?: Array<{
        type: "node" | "way";
        id: number;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: Record<string, string>;
      }>;
    };

    const features: StaticFeature[] = [];
    for (const el of data.elements ?? []) {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (lat == null || lng == null) continue;
      if (el.tags?.highway === "street_lamp") {
        features.push(stamped({ id: `osm-lamp-${el.id}`, kind: "street_lamp", lat, lng, meta: {}, source: "osm" }));
      } else if (el.tags?.highway) {
        features.push(
          stamped({
            id: `osm-road-${el.id}`,
            kind: "road",
            lat,
            lng,
            meta: { highway: el.tags.highway },
            source: "osm"
          })
        );
      }
    }

    const entry: CacheEntry = { key: cacheKey, features, fetchedAt: Date.now() };
    try {
      localStorage.setItem(CACHE_NS, JSON.stringify(entry));
    } catch {
      /* quota or disabled - fine */
    }
    return features;
  } catch {
    return [];
  }
}

function stamped(f: StaticFeature): StaticFeature {
  return f;
}

function readCache(key: string): StaticFeature[] | null {
  const raw = localStorage.getItem(CACHE_NS);
  if (!raw) return null;
  const entry = JSON.parse(raw) as CacheEntry;
  if (entry.key !== key) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
  return entry.features;
}

/** Demo-only streetlight features so the demo shows "available" coverage. */
export function demoStaticFeatures(): StaticFeature[] {
  // A handful of lamps along the busiest roads near the pilot centre.
  return [
    demoLamp("benz-a", 16.5069, 80.6484),
    demoLamp("benz-b", 16.5073, 80.6490),
    demoLamp("mg-a", 16.5116, 80.6389),
    demoLamp("mg-b", 16.5112, 80.6381),
    demoLamp("besant-a", 16.5051, 80.6442),
    demoLamp("besant-b", 16.5055, 80.6449)
  ];
}

function demoLamp(id: string, lat: number, lng: number): StaticFeature {
  return {
    id: `demo-lamp-${id}`,
    kind: "street_lamp",
    lat,
    lng,
    meta: {},
    source: "demo"
  };
}