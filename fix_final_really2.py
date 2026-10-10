import io
with io.open('src/components/layers.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('hit.bindTooltip')
end_idx = text.find(');', idx) + 2
old = text[idx:end_idx]

replacement = 'hit.bindTooltip(`${formatDuration(route.route.durationMin)} | risk ${route.riskIndex}/100 | ${route.confidence.replace("-", " ")} confidence`, { opacity: 0.9 });'

with io.open('src/components/layers.ts', 'w', encoding='utf-8') as f:
    f.write(text.replace(old, replacement))
