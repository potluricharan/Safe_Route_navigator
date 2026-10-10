import io
with io.open('src/components/RouteList.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('</svg><span className="route-duration">', '</svg>}<span className="route-duration">')

with io.open('src/components/RouteList.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
