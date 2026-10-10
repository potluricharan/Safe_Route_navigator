import io, re

with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace state and useMemo
new_state = '''  const [demoHazards, setDemoHazards] = useState<any[]>([]);
  const active = useMemo(() => {
     if (demoHazards.length > 0) return [...baseActive, ...demoHazards];
     return baseActive;
  }, [baseActive, demoHazards]);'''

text = re.sub(r'const \[demoHazard, setDemoHazard\].*?\}, \[baseActive, demoHazard\]\);', new_state, text, flags=re.DOTALL)

# Replace useEffect
new_effect = '''  useEffect(() => {
    if (routes && routes.length > 0 && demoHazards.length === 0 && !baseActive.some(h => h.isDemoData)) {
      const sorted = [...routes].sort((a,b) => a.route.durationMin - b.route.durationMin);
      const r1 = sorted[0]?.route;
      const r2 = sorted[1]?.route;
      
      const newHazards: any[] = [];
      
      if (r1) {
        const mid = r1.geometry[Math.floor(r1.geometry.length / 2)];
        newHazards.push({
          id: "demo-hazard-1", type: "waterlogging", severity: "high",
          lat: mid[0], lng: mid[1], createdAt: Date.now() - 3600000, updatedAt: Date.now(), expiresAt: Date.now() + 86400000,
          confirmations: 5, denials: 0, status: "active", reporterId: "demo", isDemoData: true, note: "Major waterlogging"
        });
        
        newHazards.push({
          id: "demo-hazard-3", type: "isolated", severity: "low",
          lat: mid[0] + 0.015, lng: mid[1] + 0.005, createdAt: Date.now() - 7200000, updatedAt: Date.now(), expiresAt: Date.now() + 86400000,
          confirmations: 1, denials: 0, status: "active", reporterId: "demo", isDemoData: true, note: "Isolated stretch"
        });
        
        newHazards.push({
          id: "demo-hazard-4", type: "lighting", severity: "medium",
          lat: mid[0] - 0.01, lng: mid[1] - 0.02, createdAt: Date.now() - 1800000, updatedAt: Date.now(), expiresAt: Date.now() + 86400000,
          confirmations: 2, denials: 0, status: "active", reporterId: "demo", isDemoData: true, note: "No street lights"
        });
      }
      
      if (r2) {
        const mid2 = r2.geometry[Math.floor(r2.geometry.length / 3)];
        newHazards.push({
          id: "demo-hazard-2", type: "accident", severity: "medium",
          lat: mid2[0], lng: mid2[1], createdAt: Date.now() - 1800000, updatedAt: Date.now(), expiresAt: Date.now() + 86400000,
          confirmations: 1, denials: 1, status: "active", reporterId: "demo", isDemoData: true, note: "Unverified accident report"
        });
      }

      setDemoHazards(newHazards);
    }
  }, [routes, demoHazards, baseActive]);'''

text = re.sub(r'useEffect\(\(\) => \{\s*if \(routes && routes\.length > 0 && !demoHazard.*?\}, \[routes, demoHazard, baseActive\]\);', new_effect, text, flags=re.DOTALL)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
