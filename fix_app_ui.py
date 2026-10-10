import io, re
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''            <RouteList
              routes={routes}'''

replacement = '''            <div style={{ display: 'flex', justifyContent: 'space-around', background: 'white', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', margin: '0 -16px 12px -16px' }}>
              {[
                { id: "driving", icon: "\U0001F697", label: "Drive" },
                { id: "bike", icon: "\U0001F6B2", label: "Ride" },
                { id: "foot", icon: "\U0001F6B6", label: "Walk" }
              ].map(m => {
                const isSelected = transportMode === m.id;
                // find fastest route for this mode to show ETA
                const rList = routes?.filter(r => r.route.id.includes(m.id)) || [];
                const fastest = rList.length ? rList.reduce((a, b) => a.route.durationMin < b.route.durationMin ? a : b) : null;
                const eta = fastest ? (fastest.route.durationMin >= 60 ? \\h \m\ : \\ min\) : "--";
                return (
                  <div key={m.id} onClick={() => setTransportMode(m.id as any)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', opacity: isSelected ? 1 : 0.4, transition: '0.2s', width: '33%' }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>{m.icon}</div>
                    <div style={{ fontSize: '13px', fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? '#1e293b' : '#64748b' }}>{eta}</div>
                  </div>
                );
              })}
            </div>
            <RouteList
              routes={routes ? routes.filter(r => r.route.id.includes(transportMode)) : null}'''

text = text.replace(target, replacement)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
