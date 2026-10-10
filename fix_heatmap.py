import io, re

with io.open('src/components/MapView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'fillOpacity: h\.severity === "high" \? 0\.3 : 0\.15', 'fillOpacity: h.severity === "high" ? 0.6 : 0.35', text)

with io.open('src/components/MapView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
