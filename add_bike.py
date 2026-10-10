import io, re
with io.open('src/services/routing.ts', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''    return data.routes.map((r, i) => {
      const distKm = +(r.distance / 1000).toFixed(2);
      // The public OSRM demo server only actually runs the 'driving' profile,
      // so we must manually calculate realistic walking times based on distance.
      // Average walking speed = 5 km/h => 12 minutes per km.
      const calcDurationMin = profile === "foot" ? distKm * 12 : r.duration / 60;'''

replacement = '''    return data.routes.map((r, i) => {
      const distKm = +(r.distance / 1000).toFixed(2);
      // The public OSRM demo server only actually runs the 'driving' profile.
      // We manually calculate realistic times based on distance.
      // Walk: 5 km/h => 12 min/km. Bike: 15 km/h => 4 min/km.
      let calcDurationMin = r.duration / 60;
      if (profile === "foot") calcDurationMin = distKm * 12;
      else if (profile === "bike") calcDurationMin = distKm * 4;'''

text = text.replace(target, replacement)

target2 = '''  let footRoutes: RouteCandidate[] = [];
  try {
    footRoutes = await attempt("foot");
  } catch (e) {
    console.warn("OSRM foot failed", e);
  }

  let drivingRoutes: RouteCandidate[] = [];
  try {
    drivingRoutes = await attempt("driving");
  } catch (e) {
    console.warn("OSRM driving failed", e);
  }

  return [...footRoutes, ...drivingRoutes];'''

replacement2 = '''  let drivingRoutes: RouteCandidate[] = [];
  try {
    drivingRoutes = await attempt("driving");
  } catch (e) {
    console.warn("OSRM driving failed", e);
  }
  
  // Since OSRM public server geometry is identical across profiles, we derive foot and bike 
  // from the driving route to save API calls and ensure zero latency!
  const footRoutes = drivingRoutes.map(r => ({ ...r, id: r.id.replace("driving", "foot"), durationMin: r.distanceKm * 12 }));
  const bikeRoutes = drivingRoutes.map(r => ({ ...r, id: r.id.replace("driving", "bike"), durationMin: r.distanceKm * 4 }));

  return [...footRoutes, ...drivingRoutes, ...bikeRoutes];'''

text = text.replace(target2, replacement2)

with io.open('src/services/routing.ts', 'w', encoding='utf-8') as f:
    f.write(text)
