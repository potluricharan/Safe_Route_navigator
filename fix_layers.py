import io, re
with io.open('src/components/layers.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Add import formatDuration
if 'formatDuration' not in text:
    text = text.replace('import type { RankedRoute } from "../services/scoring";', 'import type { RankedRoute } from "../services/scoring";\nimport { formatDuration } from "./RouteList";')

text = re.sub(r'hit\.bindTooltip\(\s*\.*?\,\s*\{\s*opacity:\s*0\.9\s*\}\s*\);', 'hit.bindTooltip(${formatDuration(route.route.durationMin)} | risk /100 |  confidence, { opacity: 0.9 });', text)

with io.open('src/components/layers.ts', 'w', encoding='utf-8') as f:
    f.write(text)
