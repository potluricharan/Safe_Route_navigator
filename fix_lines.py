import io
with io.open('src/components/MapView.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip_next = False
for line in lines:
    if skip_next:
        skip_next = False
        continue

    if 'if (props.start)' in line:
        new_lines.append('      if (props.start)\n        pointMarker({ point: props.start, color: "#22c55e", emoji: "\U0001F7E2", label: "Start" }, true).addTo(group);\n')
        skip_next = True
    elif 'if (props.destination)' in line:
        new_lines.append('      if (props.destination)\n        pointMarker({ point: props.destination, color: "#ef4444", emoji: "\U0001F3C1", label: "End" }, true).addTo(group);\n')
        new_lines.append('      if (props.currentLocation) {\n')
        new_lines.append('        L.marker(props.currentLocation, {\n')
        new_lines.append('           icon: L.divIcon({\n')
        new_lines.append('              className: "current-location-dot",\n')
        new_lines.append('              html: <div style="background:#3b82f6; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);"></div>,\n')
        new_lines.append('              iconSize: [22, 22],\n')
        new_lines.append('              iconAnchor: [11, 11]\n')
        new_lines.append('           })\n')
        new_lines.append('        }).addTo(group);\n')
        new_lines.append('      }\n')
        skip_next = True
    elif '}, [props.start, props.destination]);' in line:
        new_lines.append('    }, [props.start, props.destination, props.currentLocation]);\n')
    else:
        new_lines.append(line)

with io.open('src/components/MapView.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
