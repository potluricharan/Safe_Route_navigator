import io, re
with io.open('src/services/routing.ts', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''export async function fetchAvoidHazardsRoute(
  start: LatLng,
  destination: LatLng,
  hazards: Hazard[],
  now: number,
  raining: boolean,
  signal?: AbortSignal
): Promise<RouteCandidate[]> {
  const key = import.meta.env.VITE_ORS_API_KEY as string | undefined;
  if (!key || !/^[0-9a-f]{32,}$/i.test(key)) return [];

  const [sLat, sLng] = start;
  const [dLat, dLng] = destination;

  const avoid = activeHazards(hazards, now, raining)
    .filter((h) => h.severity === "high")
    .slice(0, 5)
    .map((h) => circlePolygon([h.lat, h.lng], h.type === "accident" || h.type === "temporary_obstruction" ? 60 : 35));

  const url = `${ORS_BASE}/v2/directions/foot-walking`;
  const body = {
    start: [sLng, sLat],
    end: [dLng, dLat],
    ...(avoid.length ? { avoid_polygons: avoid } : {})
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: key
    },
    body: JSON.stringify(body),
    signal
  });
  if (!res.ok) {
    if (res.status === 403 || res.status === 401) return [];
    throw new Error(`ORS HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    routes?: Array<{
      geometry: { coordinates?: [number, number][] };
      summary: { distance: number; duration: number };
    }>;
  };
  const r = data.routes?.[0];
  if (!r?.geometry.coordinates) return [];
  const distKm = +(r.summary.distance / 1000).toFixed(2);
  const geom = toLatLng(r.geometry.coordinates);
  
  return [
    {
      id: "ors-avoid-driving",
      provider: "ors" as const,
      kind: "avoid_hazards" as const,
      geometry: geom,
      distanceKm: distKm,
      durationMin: +(r.summary.duration / 60).toFixed(1) // OSRM gives realistic car time usually, ORS foot might give walk time, wait let's use standard math for consistency
    },
    {
      id: "ors-avoid-bike",
      provider: "ors" as const,
      kind: "avoid_hazards" as const,
      geometry: geom,
      distanceKm: distKm,
      durationMin: +(distKm * 4).toFixed(1)
    },
    {
      id: "ors-avoid-foot",
      provider: "ors" as const,
      kind: "avoid_hazards" as const,
      geometry: geom,
      distanceKm: distKm,
      durationMin: +(distKm * 12).toFixed(1)
    }
  ];
}'''

replacement = '''export async function fetchAvoidHazardsRoute(
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
}'''

# Replace ORS with BRouter
text = re.sub(r'export async function fetchAvoidHazardsRoute.*?^}', replacement, text, flags=re.MULTILINE|re.DOTALL)

with io.open('src/services/routing.ts', 'w', encoding='utf-8') as f:
    f.write(text)

with io.open('src/hooks/useRoutes.ts', 'r', encoding='utf-8') as f:
    hooks_text = f.read()

# Fix caching issue in useRoutes so it actively reroutes when hazards change!
hooks_text = hooks_text.replace(
    'const key = `${start[0].toFixed(5)},${start[1].toFixed(5)}>${destination[0].toFixed(5)},${destination[1].toFixed(5)}`;',
    'const hazardHash = hazards.filter(h => h.severity === "high").map(h => h.id).join(",");\n        const key = `${start[0].toFixed(5)},${start[1].toFixed(5)}>${destination[0].toFixed(5)},${destination[1].toFixed(5)}|${hazardHash}`;'
)

with io.open('src/hooks/useRoutes.ts', 'w', encoding='utf-8') as f:
    f.write(hooks_text)
