import io, re
with io.open('src/components/layers.ts', 'r', encoding='utf-8') as f:
    text = f.read()

target = r'hit\.bindTooltip\([^;]+;'
replacement = 'hit.bindTooltip(\ | risk \/100 | \ confidence, { opacity: 0.9 });'

text = re.sub(target, replacement, text)

with io.open('src/components/layers.ts', 'w', encoding='utf-8') as f:
    f.write(text)
