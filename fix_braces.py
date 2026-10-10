import io
with io.open('src/components/RouteList.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('</svg>}}<span', '</svg><span')

with io.open('src/components/RouteList.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
