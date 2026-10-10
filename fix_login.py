import io, re
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target1 = 'export default function App() {'
replacement1 = '''export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);'''

text = text.replace(target1, replacement1)

target2 = '''  return (
    <div className="app">'''
replacement2 = '''  if (!isLoggedIn) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
         <div style={{ fontSize: '64px', marginBottom: '16px', animation: isAuthenticating ? 'pulse 1s infinite' : 'none' }}>???</div>
         <h1 style={{ fontSize: '36px', margin: '0 0 12px 0', letterSpacing: '-0.5px' }}>Safe-Route <span style={{ color: '#3b82f6' }}>Navigator</span></h1>
         <p style={{ color: '#94a3b8', marginBottom: '40px', fontSize: '18px' }}>Intelligent routing with real-time safety tracking.</p>
         <button 
           onClick={() => {
             setIsAuthenticating(true);
             setTimeout(() => setIsLoggedIn(true), 1200);
           }}
           disabled={isAuthenticating}
           style={{ background: '#3b82f6', color: 'white', padding: '14px 40px', borderRadius: '30px', fontSize: '18px', fontWeight: 'bold', border: 'none', cursor: isAuthenticating ? 'wait' : 'pointer', boxShadow: '0 4px 20px rgba(59, 130, 246, 0.5)', transition: 'all 0.2s', opacity: isAuthenticating ? 0.7 : 1 }}
         >
           {isAuthenticating ? 'Authenticating...' : 'Access Navigator'}
         </button>
      </div>
    );
  }

  return (
    <div className="app">'''

text = text.replace(target2, replacement2)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
