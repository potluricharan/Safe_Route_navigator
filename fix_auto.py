import io
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('label: "Drive" }', 'label: "Drive", title: "Car & Auto-rickshaw (estimate)" }')
text = text.replace('title={m.label}', 'title={m.title || m.label}')
if 'title={m.title' not in text:
    text = text.replace('<div key={m.id}', '<div key={m.id} title={m.title || m.label}')

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
