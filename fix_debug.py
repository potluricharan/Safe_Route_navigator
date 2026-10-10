import io
with io.open('src/components/layers.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('const actives = activeHazards(hazards, now, raining);', 'const actives = activeHazards(hazards, now, raining);\n  console.log("drawHazardMarkers drawing actives:", actives);')

with io.open('src/components/layers.ts', 'w', encoding='utf-8') as f:
    f.write(text)
