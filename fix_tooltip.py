import io, re
with io.open('src/components/layers.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'durationMin\} min.*?est\. risk \$\{route\.riskIndex\}/100.*?\$\{route\.confidence\}', 'durationMin} min | risk /100 |  confidence', text)

with io.open('src/components/layers.ts', 'w', encoding='utf-8') as f:
    f.write(text)
