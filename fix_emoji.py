import io
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('animation: \'pulse 1.5s infinite\' }}>')
if idx != -1:
    end_idx = text.find('</div>', idx)
    text = text[:idx + 36] + '\U0001F6E1\uFE0F' + text[end_idx:]
    with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
