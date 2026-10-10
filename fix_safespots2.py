import io, re
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace button text safely
text = re.sub(r'>.*Nearest Police Station\s*</button>', '>\U0001f6e1\uFE0F Nearest Safe Place</button>', text)

# Replace Modal title and paragraph
text = re.sub(r'<h2.*?>Nearest Police Station</h2>', '<h2 style={{ margin: "0 0 8px 0", color: "#f8fafc" }}>Nearest Safe Place</h2>', text)
text = re.sub(r'>Would you like to dial emergency services immediately\?</p>', '>Would you like to reroute here for immediate safety?</p>', text)

# Replace the two buttons inside the modal
new_buttons = '''<div style={{ display: 'flex', gap: '12px' }}>
                 <button style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #475569', background: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setSosPlace(null)}>Cancel</button>
                 <button style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', background: '#22c55e', color: 'white', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(34, 197, 94, 0.3)' }} onClick={() => { 
                    setDestination([sosPlace.place.lat ?? sosPlace.place.center?.lat, sosPlace.place.lon ?? sosPlace.place.center?.lon]);
                    setSosPlace(null);
                 }}>\U0001f9ed Route Here</button>
              </div>'''
text = re.sub(r'<div style=\{\{ display: \'flex\', gap: \'12px\' \}\}>.*?<\/div>', new_buttons, text, flags=re.DOTALL)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
