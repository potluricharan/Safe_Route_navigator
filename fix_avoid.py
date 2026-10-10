import io
with io.open('src/services/routing.ts', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''    return [
      {
        id: "ors-avoid",
        provider: "ors" as const,
        kind: "avoid_hazards" as const,
        geometry: toLatLng(r.geometry.coordinates),
        distanceKm: +(r.summary.distance / 1000).toFixed(2),
        durationMin: +(r.summary.duration / 60).toFixed(1)
      }
    ];'''

replacement = '''    const distKm = +(r.summary.distance / 1000).toFixed(2);
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
    ];'''

text = text.replace(target, replacement)

# Also wait, ORS URL is hardcoded to foot-walking. Let's change it to driving-car so it generates vehicle routes
text = text.replace('const url = `${ORS_BASE}/v2/directions/foot-walking`;', 'const url = `${ORS_BASE}/v2/directions/driving-car`;')

with io.open('src/services/routing.ts', 'w', encoding='utf-8') as f:
    f.write(text)
