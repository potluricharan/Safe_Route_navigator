import io
with io.open('src/components/RouteList.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

badge = '<div className="route-head">\n              {route.rank === 1 && <span style={{ background: \'#eab308\', color: \'white\', padding: \'2px 6px\', borderRadius: \'4px\', fontSize: \'11px\', fontWeight: \'bold\', marginRight: \'8px\' }}>\U0001f451 Best Route</span>}'

text = text.replace('<div className="route-head">', badge)

with io.open('src/components/RouteList.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
