import io
with io.open('src/config/app.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'icon:' in line and 'icon: string' not in line:
        context = "".join(lines[max(0, i-10):i])
        if 'poor_lighting' in context:
            lines[i] = '    icon: "\\u{1F4A1}",\n'
        elif 'waterlogging' in context:
            lines[i] = '    icon: "\\u{1F30A}",\n'
        elif 'accident' in context:
            lines[i] = '    icon: "\\u{1F4A5}",\n'
        elif 'temporary_obstruction' in context:
            lines[i] = '    icon: "\\u{1F6A7}",\n'
        elif 'road_damage' in context:
            lines[i] = '    icon: "\\u{1F573}\\uFE0F",\n'
        elif 'isolated_stretch' in context:
            lines[i] = '    icon: "\\u{1F3DC}\\uFE0F",\n'

with io.open('src/config/app.ts', 'w', encoding='utf-8') as f:
    f.writelines(lines)

with io.open('src/components/layers.ts', 'r', encoding='utf-8') as f:
    text = f.read()
    
import re
target_html = '''function hazardMarkerHtml(h: Hazard): string {
  return (
    `<span class="hm-${h.severity}">${h.type === "poor_lighting" ? "\\u{1F4A1}" : h.type === "waterlogging" ? "\\u{1F30A}" : h.type === "accident" ? "\\u{1F4A5}" : h.type === "temporary_obstruction" ? "\\u{1F6A7}" : h.type === "road_damage" ? "\\u{1F573}\\uFE0F" : "\\u{1F3DC}\\uFE0F"}<i class="badge">${h.confirmations}</i></span>`
  );
}'''

text = text[:text.find('function hazardMarkerHtml')] + target_html + text[text.find('function hazardPopupHtml')-1:]
with io.open('src/components/layers.ts', 'w', encoding='utf-8') as f:
    f.write(text)
