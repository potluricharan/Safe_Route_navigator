import io, re
with io.open('src/components/RouteList.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add formatDuration at the top
if 'function formatDuration' not in text:
    text = text.replace('import { activeHazards, type RankedRoute } from "../services/scoring";', 'import { activeHazards, type RankedRoute } from "../services/scoring";\n\nexport function formatDuration(minutes: number) {\n  const rounded = Math.round(minutes);\n  if (rounded < 60) return ${rounded} min;\n  const h = Math.floor(rounded / 60);\n  const m = rounded % 60;\n  return m > 0 ? ${h} hr  min : ${h} hr;\n}')

# Fix the main route duration display
text = re.sub(r'<span className="route-duration">\{route\.route\.durationMin\} min</span>', '<span className="route-duration">{formatDuration(route.route.durationMin)}</span>', text)

# Fix timeDiffs
text = re.sub(r'\+\$\{timeDiff\} min', '+', text)

with io.open('src/components/RouteList.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
