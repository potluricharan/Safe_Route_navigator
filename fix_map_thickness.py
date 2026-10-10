import io
with io.open('src/components/MapView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''    if (tomTomKey) {
      L.tileLayer(`https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?tileSize=256&key=${tomTomKey}`, {
        maxZoom: 19,
        opacity: 0.8,
        attribution: '&copy; TomTom Traffic'
      }).addTo(map);
    }'''

replacement = '''    if (tomTomKey) {
      L.tileLayer(`https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?tileSize=256&thickness=20&key=${tomTomKey}`, {
        maxZoom: 19,
        opacity: 1.0,
        attribution: '&copy; TomTom Traffic'
      }).addTo(map);
    }'''

text = text.replace(target, replacement)

with io.open('src/components/MapView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
