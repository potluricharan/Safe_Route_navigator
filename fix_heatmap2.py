import io, re

with io.open('src/components/MapView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'radius: 150, color: \'#ef4444\', fillColor: \'#ef4444\', fillOpacity: 0\.15', 'radius: 150, color: \'#ef4444\', fillColor: \'#ef4444\', fillOpacity: 0.4', text)
text = re.sub(r'radius: 50, color: \'#ef4444\', fillColor: \'#ef4444\', fillOpacity: 0\.3', 'radius: 50, color: \'#ef4444\', fillColor: \'#ef4444\', fillOpacity: 0.8', text)

with io.open('src/components/MapView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
