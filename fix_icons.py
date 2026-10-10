import io, re
with io.open('src/components/RouteList.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'<span className="route-duration">', '{route.route.id.includes("foot") ? (<span style={{ fontSize: \'14px\', marginRight: \'6px\' }} title="Walking Route">\U0001F6B6</span>) : (<span style={{ fontSize: \'14px\', marginRight: \'6px\' }} title="Driving Route">\U0001F697</span>)}<span className="route-duration">', text)

with io.open('src/components/RouteList.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
