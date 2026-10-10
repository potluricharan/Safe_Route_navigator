import io, re
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add transportMode state
text = text.replace('const [pickMode, setPickMode] = useState<PickMode>(null);', 'const [pickMode, setPickMode] = useState<PickMode>(null);\n  const [transportMode, setTransportMode] = useState<"driving" | "foot" | "bike">("driving");')

# Filter routes passed to RouteList
target = '<RouteList\n            routes={scoredRoutes}'
replacement = '''<div style={{ display: 'flex', justifyContent: 'space-around', background: 'white', padding: '12px', borderBottom: '1px solid #e2e8f0', margin: '0 -16px' }}>
              {[
                { id: "driving", icon: "\U0001F697", label: "Drive" },
                { id: "bike", icon: "\U0001F6B2", label: "Ride" },
                { id: "foot", icon: "\U0001F6B6", label: "Walk" }
              ].map(m => {
                const isSelected = transportMode === m.id;
                // find fastest route for this mode to show ETA
                const rList = scoredRoutes?.filter(r => r.route.id.includes(m.id)) || [];
                const fastest = rList.length ? rList.reduce((a, b) => a.route.durationMin < b.route.durationMin ? a : b) : null;
                const eta = fastest ? (fastest.route.durationMin >= 60 ? ${Math.floor(fastest.route.durationMin / 60)}h m : ${Math.round(fastest.route.durationMin)} min) : "--";
                return (
                  <div key={m.id} onClick={() => setTransportMode(m.id as any)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', opacity: isSelected ? 1 : 0.4, transition: '0.2s', width: '33%' }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>{m.icon}</div>
                    <div style={{ fontSize: '13px', fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? '#1e293b' : '#64748b' }}>{eta}</div>
                  </div>
                );
              })}
            </div>
            <RouteList
            routes={scoredRoutes ? scoredRoutes.filter(r => r.route.id.includes(transportMode)) : null}'''

text = text.replace(target, replacement)

# Do it for both desktop and mobile panels if needed.
# Let's just do it directly.

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
