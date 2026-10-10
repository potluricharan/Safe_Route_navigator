import io
with io.open('src/config/app.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('maxReportsPerHour: 5,', 'maxReportsPerHour: 50,')

with io.open('src/config/app.ts', 'w', encoding='utf-8') as f:
    f.write(text)
