import io, re
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('mapCenter={CAMPUS.center}', 'mapCenter={CAMPUS.center}\\n          currentLocation={geo.position}')

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
