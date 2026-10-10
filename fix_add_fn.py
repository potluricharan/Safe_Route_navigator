import io
with io.open('src/components/RouteList.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('import { activeHazards, type RankedRoute } from "../services/scoring";\n\nexport function formatDuration(minutes: number)', 'import { activeHazards, type RankedRoute } from "../services/scoring";')

if 'export function formatDuration' not in text:
    text = text.replace('import { activeHazards, type RankedRoute } from "../services/scoring";', 'import { activeHazards, type RankedRoute } from "../services/scoring";\n\nexport function formatDuration(minutes: number) {\n  const rounded = Math.round(minutes);\n  if (rounded < 60) return `${rounded} min`;\n  const h = Math.floor(rounded / 60);\n  const m = rounded % 60;\n  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;\n}')

with io.open('src/components/RouteList.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
