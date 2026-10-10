import io, re
with io.open('src/components/RouteList.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('bannerText = `Lower-risk choice: +. Avoids ${hazardsAvoided}', 'bannerText = `Lower-risk choice: +${formatDuration(timeDiff)}. Avoids ${hazardsAvoided}')

if 'export function formatDuration' not in text:
    text = text.replace('function formatDuration', 'export function formatDuration')

text = text.replace('+{timeDiff} min,', '+{formatDuration(timeDiff)},')

with io.open('src/components/RouteList.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
