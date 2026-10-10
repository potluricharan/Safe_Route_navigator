import io, re
with io.open('src/services/routing.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('async function attempt(profile: "foot" | "driving") {', 'async function attempt(profile: "foot" | "driving" | "bike") {')

with io.open('src/services/routing.ts', 'w', encoding='utf-8') as f:
    f.write(text)
