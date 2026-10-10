import io, re
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target_pattern = re.compile(re.escape('  if (!isLoggedIn) {\n    return (') + '.*?' + re.escape('    );\n  }'), re.DOTALL)

replacement = '''  if (!isLoggedIn) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
         <style dangerouslySetInnerHTML={{ __html: "@keyframes fillProgress { 0% { width: 0%; } 15% { width: 30%; } 50% { width: 50%; } 80% { width: 90%; } 100% { width: 100%; } }" }} />
         <div style={{ fontSize: '80px', marginBottom: '24px', animation: 'pulse 1.5s infinite' }}>\U0001F6E1\uFE0F</div>
         <h1 style={{ fontSize: '42px', margin: '0 0 12px 0', letterSpacing: '-0.5px' }}>Safe-Route <span style={{ color: '#3b82f6' }}>Navigator</span></h1>
         <p style={{ color: '#94a3b8', fontSize: '20px', fontWeight: 500, marginBottom: '40px' }}>Intelligent routing with real-time safety tracking</p>
         
         <div style={{ width: '280px', height: '6px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#3b82f6', borderRadius: '4px', animation: 'fillProgress 2.5s ease-out forwards' }}></div>
         </div>
         <div style={{ marginTop: '16px', color: '#64748b', fontSize: '13px', fontWeight: 600, letterSpacing: '1px' }}>INITIALIZING ENGINE...</div>
      </div>
    );
  }'''

text = target_pattern.sub(replacement, text)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
