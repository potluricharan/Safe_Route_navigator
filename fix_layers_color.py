import io, re

with io.open('src/components/layers.ts', 'r', encoding='utf-8') as f:
    text = f.read()

new_logic = '''      // casing so parallel routes stay readable
      L.polyline(path, {
        color: selected ? "#0f172a" : "#475569",
        weight: selected ? 10 : 8,
        opacity: selected ? 0.6 : 0.8,
        interactive: !selected
      }).on("click", () => {
        if (!selected) onPick(route.route.id);
      }).addTo(group);
  
      if (selected) {
        // per-segment colour banding only for selected route
        for (const seg of route.segments) {
          const pts = seg.points.map(([lat, lng]) => L.latLng(lat, lng));
          L.polyline(pts, {
            color: TIER_COLORS[seg.tier],
            weight: 6,
            opacity: 1.0,
            interactive: false
          }).addTo(group);
        }
      }'''

text = re.sub(r'// casing so parallel routes stay readable.*?(?=L\.polyline\(path, \{\s*color: "#ffffff")', new_logic, text, flags=re.DOTALL)

with io.open('src/components/layers.ts', 'w', encoding='utf-8') as f:
    f.write(text)
