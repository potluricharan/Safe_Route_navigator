import io, re
with io.open('src/services/routing.ts', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''    return data.routes.map((r, i) => ({
      id: osrm-C:\Users\DELL\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1-,
      provider: "osrm" as const,
      kind: "plain" as const,
      geometry: toLatLng(r.geometry.coordinates),
      distanceKm: +(r.distance / 1000).toFixed(2),
      durationMin: +(r.duration / 60).toFixed(1)
    }));'''

replacement = '''    return data.routes.map((r, i) => {
      const distKm = +(r.distance / 1000).toFixed(2);
      // The public OSRM demo server only actually runs the 'driving' profile,
      // so we must manually calculate realistic walking times based on distance.
      // Average walking speed = 5 km/h => 12 minutes per km.
      const calcDurationMin = profile === "foot" ? distKm * 12 : r.duration / 60;
      return {
        id: osrm-C:\Users\DELL\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1-,
        provider: "osrm" as const,
        kind: "plain" as const,
        geometry: toLatLng(r.geometry.coordinates),
        distanceKm: distKm,
        durationMin: +calcDurationMin.toFixed(1)
      };
    });'''

text = text.replace(target, replacement)

with io.open('src/services/routing.ts', 'w', encoding='utf-8') as f:
    f.write(text)
