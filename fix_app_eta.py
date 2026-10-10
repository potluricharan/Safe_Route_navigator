import io
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Make sure formatDuration is imported
if 'import { formatDuration } from "./components/RouteList";' not in text:
    text = text.replace('import RouteList from "./components/RouteList";', 'import RouteList, { formatDuration } from "./components/RouteList";')

target = '''                  const eta = fastest ? (fastest.route.durationMin >= 60 ? `${Math.floor(fastest.route.durationMin / 60)}h ${Math.floor(fastest.route.durationMin % 60)}m` : `${Math.round(fastest.route.durationMin)} min`) : "--";'''
replacement = '''                  const eta = fastest ? formatDuration(fastest.route.durationMin) : "--";'''

text = text.replace(target, replacement)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
