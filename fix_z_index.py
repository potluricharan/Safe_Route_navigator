import io
with io.open('src/components/layers.ts', 'r', encoding='utf-8') as f:
    text = f.read()

old_loop = '  for (const route of routes) {'
new_loop = '''  const sortedRoutes = [...routes].sort((a, b) => {
    if (a.route.id === selectedId) return 1;
    if (b.route.id === selectedId) return -1;
    return 0;
  });
  for (const route of sortedRoutes) {'''

text = text.replace(old_loop, new_loop)

with io.open('src/components/layers.ts', 'w', encoding='utf-8') as f:
    f.write(text)
