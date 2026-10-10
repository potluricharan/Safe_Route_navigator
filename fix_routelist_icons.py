import io, re
with io.open('src/components/RouteList.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

svg_car = '''<svg style={{marginRight: '6px'}} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 12 10s-6.7.6-8.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><path d="m5 11 1.5-5.5C6.8 4.6 7.8 4 9 4h6c1.2 0 2.2.6 2.5 1.5L19 11"/><circle cx="6.5" cy="16.5" r="1.5"/><circle cx="17.5" cy="16.5" r="1.5"/></svg>'''
svg_walk = '''<svg style={{marginRight: '6px'}} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><path d="m9 20 2.5-4L11 10.5 10 9 8 10"/><path d="m11 16 3-4.5L12 9l-2-2 1-3"/><path d="m15 11.5 2 1.5"/><path d="m15 20-3-5"/></svg>'''
svg_bike = '''<svg style={{marginRight: '6px'}} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-3 11.5V14l-3-3 4-3 2 3h2"/><path d="m10.5 13.5-3-3"/></svg>'''

text = re.sub(r'\{route\.route\.id\.includes\("foot"\) \? \(<span.*?Walking Route">.*?</span>\) : \(<span.*?Driving Route">.*?</span>\)', f'{{route.route.id.includes("foot") ? {svg_walk} : route.route.id.includes("bike") ? {svg_bike} : {svg_car}}}', text)

with io.open('src/components/RouteList.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
