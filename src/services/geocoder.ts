export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
  kind: string;
}

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

/**
 * Nominatim geocoder. Public server is rate-limited (max ~1 req/sec) and needs
 * an identifying header per the usage policy, so this is demo-scale only.
 */
export async function geocode(
  query: string,
  opts: { near?: [number, number]; limit?: number; signal?: AbortSignal } = {}
): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const params = new URLSearchParams({
    q,
    format: "jsonv2",
    addressdetails: "0",
    limit: String(opts.limit ?? 5),
    countrycodes: "in"
  });
  if (opts.near) {
    const d = 0.25;
    params.set(
      "viewbox",
      `${opts.near[1] - d},${opts.near[0] + d},${opts.near[1] + d},${opts.near[0] - d}`
    );
    params.set("bounded", "0");
  }

  try {
    const res = await fetch(`${NOMINATIM}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: opts.signal
    });
    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
    const data = (await res.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
      type?: string;
    }>;
    return data.map((d) => ({
      label: d.display_name,
      lat: Number(d.lat),
      lng: Number(d.lon),
      kind: d.type ?? "place"
    }));
  } catch {
    return [];
  }
}

/** Fallback used when there is no network: match seeded campus landmarks. */
export function geocodeLocal(
  query: string,
  landmarks: readonly { name: string; lat: number; lng: number }[]
): GeocodeResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return landmarks
    .filter((l) => l.name.toLowerCase().includes(q))
    .map((l) => ({ label: l.name, lat: l.lat, lng: l.lng, kind: "landmark" }));
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const d = (await res.json()) as { display_name?: string };
    return d.display_name ?? null;
  } catch {
    return null;
  }
}