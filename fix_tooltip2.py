import io, re
with io.open('src/components/layers.ts', 'r', encoding='utf-8') as f:
    text = f.read()

target = '${route.route.durationMin} min | risk /100 |  confidence'
replacement = '${route.route.durationMin} min | risk /100 |  confidence'
text = text.replace(target, replacement)

with io.open('src/components/layers.ts', 'w', encoding='utf-8') as f:
    f.write(text)
