import io
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''  const onVote = async (id: string, vote: "yes" | "no") => {'''

replacement = '''  // Live Feed Simulator
  useEffect(() => {
    if (!provider || !hazards.ready) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/live_traffic.json?t=' + Date.now());
        const data = await res.json();
        if (Array.isArray(data)) {
          for (const item of data) {
            // Check if we already have it by a custom note or rough coordinate match
            const exists = hazards.active.some(h => h.note === item.id);
            if (!exists) {
              provider.addHazard({
                type: "temporary_obstruction",
                severity: "high",
                lat: item.lat,
                lng: item.lng,
                note: item.id,
                reporterId: "live-sensor-system"
              });
            }
          }
        }
      } catch (e) {}
    }, 3000);
    return () => clearInterval(interval);
  }, [provider, hazards.ready, hazards.active]);

  const onVote = async (id: string, vote: "yes" | "no") => {'''

text = text.replace(target, replacement)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
