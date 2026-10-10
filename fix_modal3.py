import io, re
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

modal_jsx = '''
      {sosPlace && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#1e293b', borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)', border: '1px solid #334155', color: 'white', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>\U0001f6e1\uFE0F</div>
            <h2 style={{ margin: '0 0 8px 0', color: '#f8fafc' }}>Nearest Safe Place</h2>
            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', margin: '16px 0' }}>
               <div style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '18px', marginBottom: '4px' }}>{sosPlace.typeStr}</div>
               <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>{sosPlace.name}</div>
               <div style={{ color: '#94a3b8' }}>Only <strong style={{ color: '#10b981' }}>{sosPlace.distMeters}m</strong> away from your location.</div>
            </div>
            <p style={{ color: '#cbd5e1', marginBottom: '24px', fontSize: '14px' }}>Would you like to dial emergency services immediately?</p>
            <div style={{ display: 'flex', gap: '12px' }}>
               <button style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #475569', background: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setSosPlace(null)}>Cancel</button>
               <button style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)' }} onClick={() => { window.location.href = "tel:100"; setSosPlace(null); }}>\U0001f4de Dial 100 Now</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}'''

text = re.sub(r'\{toast && <div className="toast">\{toast\}<\/div>\}', modal_jsx, text)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
