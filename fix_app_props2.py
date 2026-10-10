import io
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('              disabled={!routes?.length}\n', '')

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
