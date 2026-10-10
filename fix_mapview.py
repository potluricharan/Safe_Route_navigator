import io, re
with io.open('src/components/MapView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target1 = '  mapCenter: LatLngPair;'
replacement1 = '  mapCenter: LatLngPair; currentLocation?: [number, number] | null;'
text = text.replace(target1, replacement1)

target2 = '''      if (props.destination)
        pointMarker({ point: props.destination, color: "#ef4444", emoji: "??", label: "End" }, true).addTo(group);'''
replacement2 = '''      if (props.destination)
        pointMarker({ point: props.destination, color: "#ef4444", emoji: "??", label: "End" }, true).addTo(group);
      
      if (props.currentLocation) {
        L.marker(props.currentLocation, {
           icon: L.divIcon({
              className: "current-location-dot",
              html: <div style="background:#3b82f6; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.8); animation: pulse 2s infinite;"></div>,
              iconSize: [22, 22],
              iconAnchor: [11, 11]
           })
        }).addTo(group);
      }'''

text = text.replace(target2, replacement2)

# Ensure currentLocation triggers redraw
target3 = '    }, [props.start, props.destination]);'
replacement3 = '    }, [props.start, props.destination, props.currentLocation]);'
text = text.replace(target3, replacement3)

with io.open('src/components/MapView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
