import io
with io.open('src/components/MapView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);'''

replacement = '''    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    // Add Live Traffic Layer if TomTom Key is present
    const tomTomKey = import.meta.env.VITE_TOMTOM_KEY;
    if (tomTomKey) {
      L.tileLayer(`https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?tileSize=256&key=${tomTomKey}`, {
        maxZoom: 19,
        opacity: 0.8,
        attribution: '&copy; TomTom Traffic'
      }).addTo(map);
    }'''

text = text.replace(target, replacement)

with io.open('src/components/MapView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
