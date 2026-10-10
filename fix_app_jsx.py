import io
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

start_idx = text.find('{panel === "routes" ? (')
end_idx = text.find('          </div>\n        ) : (\n          <div className="sheet-body">')

new_block = '''{panel === "routes" ? (
          <div className="sheet-body">
            <SearchBar
              start={start}
              startLabel={startLabel}
              destination={destination}
              destLabel={destLabel}
              onSet={setPoint}
              onSwap={() => {
                const s = start;
                const sl = startLabel;
                setStart(destination);
                setStartLabel(destLabel);
                setDestination(s);
                setDestLabel(sl);
              }}
              onPickWithMap={(which) => {
                setPickMode((p) => (p === which ? null : which));
              }}
              pickMode={pickMode}
            />

            <RouteControls
              mode={mode}
              onModeChange={setMode}
              disabled={!routes?.length}
            />

            {selection && (
              <div className="confidence-note">
                Data confidence: <ConfidenceBadge level={selectionRoute(routes, selection)?.confidence ?? "limited"} inline /> |{" "}
                {confidenceHint(selectionRoute(routes, selection)?.confidence ?? "limited").toLowerCase()}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-around', background: 'white', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', margin: '0 -16px 12px -16px' }}>
              {[
                { id: "driving", icon: "\U0001F697", label: "Drive" },
                { id: "bike", icon: "\U0001F6B2", label: "Ride" },
                { id: "foot", icon: "\U0001F6B6", label: "Walk" }
              ].map(m => {
                const isSelected = transportMode === m.id;
                const rList = routes?.filter(r => r.route.id.includes(m.id)) || [];
                const fastest = rList.length ? rList.reduce((a, b) => a.route.durationMin < b.route.durationMin ? a : b) : null;
                const eta = fastest ? (fastest.route.durationMin >= 60 ? `${Math.floor(fastest.route.durationMin / 60)}h ${Math.floor(fastest.route.durationMin % 60)}m` : `${Math.round(fastest.route.durationMin)} min`) : "--";
                return (
                  <div key={m.id} onClick={() => { setTransportMode(m.id as any); setSelection(null); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', opacity: isSelected ? 1 : 0.4, transition: '0.2s', width: '33%' }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>{m.icon}</div>
                    <div style={{ fontSize: '13px', fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? '#1e293b' : '#64748b' }}>{eta}</div>
                  </div>
                );
              })}
            </div>

            <RouteList
              routes={routes ? routes.filter(r => r.route.id.includes(transportMode)) : null}
              selectedId={selection}
              mode={mode}
              conditions={conditions}
              onSelect={setSelectedRouteId}
              loading={loading}
              error={error}
            />'''

text = text[:start_idx] + new_block + text[end_idx:]

# Also fix the garbled characters that PowerShell wrote for car/bike/foot emojis inside App.tsx earlier
text = text.replace('dYs-', '\U0001F697')
text = text.replace('dYs', '\U0001F6B2')
text = text.replace('dYs ', '\U0001F6B6')
text = text.replace('dY>,?', '\U0001F6E1\uFE0F')

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
