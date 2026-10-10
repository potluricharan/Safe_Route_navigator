import io
with io.open('src/components/MapView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = 'html: <div style="background:#3b82f6; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);"></div>,'
replacement = 'html: \'<div style="background:#3b82f6; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);"></div>\','

text = text.replace(target, replacement)

with io.open('src/components/MapView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
