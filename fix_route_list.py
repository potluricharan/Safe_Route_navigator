import io, re
with io.open('src/components/RouteList.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = '              <span className="route-duration">{route.route.durationMin} min</span>'
replacement = '''              {route.route.id.includes("foot") ? (
                 <span style={{ fontSize: '13px', marginRight: '4px' }}>\U0001F6B6</span>
              ) : (
                 <span style={{ fontSize: '13px', marginRight: '4px' }}>\U0001F697</span>
              )}
              <span className="route-duration">{route.route.durationMin} min</span>'''

text = text.replace(target, replacement)

with io.open('src/components/RouteList.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
