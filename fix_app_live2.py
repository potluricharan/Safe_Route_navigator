import io
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''            if (!exists) {
              provider.addHazard({
                type: "temporary_obstruction",
                severity: "high",
                lat: item.lat,
                lng: item.lng,
                note: item.id,
                reporterId: "live-sensor-system"
              });
            }'''

replacement = '''            if (!exists) {
              provider.addHazard({
                type: item.type || "temporary_obstruction",
                severity: "high",
                lat: item.lat,
                lng: item.lng,
                note: item.id,
                reporterId: "live-sensor-system"
              });
            }'''

text = text.replace(target, replacement)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
