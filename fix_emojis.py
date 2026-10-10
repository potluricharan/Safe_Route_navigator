import io, re
# Fix layers.ts
with io.open('src/components/layers.ts', 'r', encoding='utf-8') as f:
    text = f.read()

target_html = '''function hazardMarkerHtml(h: Hazard): string {
  return (
    `<span class="hm-${h.severity}">${h.type === "poor_lighting" ? "\U0001F4A1" : h.type === "waterlogging" ? "\U0001F30A" : h.type === "accident" ? "\U0001F4A5" : h.type === "temporary_obstruction" ? "\U0001F6A7" : h.type === "road_damage" ? "\U0001F573\uFE0F" : "\U0001F3DC\uFE0F"}<i class="badge">${h.confirmations}</i></span>`
  );
}'''

text = re.sub(r'function hazardMarkerHtml\(h: Hazard\): string \{.*?^\}', target_html, text, flags=re.MULTILINE|re.DOTALL)

with io.open('src/components/layers.ts', 'w', encoding='utf-8') as f:
    f.write(text)

# Fix app.ts
with io.open('src/config/app.ts', 'r', encoding='utf-8') as f:
    text2 = f.read()

text2 = text2.replace('"dY\'"', '"\U0001F4A1"')
text2 = text2.replace('"dYOS"', '"\U0001F30A"')
text2 = text2.replace('"dYs""', '"\U0001F4A5"')
text2 = text2.replace('">""', '"\U0001F6A7"')
text2 = text2.replace('"dY 3,?"', '"\U0001F573\uFE0F"')
text2 = text2.replace('"dYO`"', '"\U0001F3DC\uFE0F"')

with io.open('src/config/app.ts', 'w', encoding='utf-8') as f:
    f.write(text2)
