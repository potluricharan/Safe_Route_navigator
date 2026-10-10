import io, re
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target1 = '''export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);'''

replacement1 = '''export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoggedIn(true), 2500);
    return () => clearTimeout(timer);
  }, []);'''

text = text.replace(target1, replacement1)

target2_start = 'if (!isLoggedIn) {'
target2_end = 'return (\n    <div className="app">'

pattern = re.compile(re.escape('if (!isLoggedIn) {') + '.*?' + re.escape('return (\n    <div className="app">'), re.DOTALL)

replacement2 = '''if (!isLoggedIn) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
         <div style={{ fontSize: '80px', marginBottom: '24px', animation: 'pulse 1.5s infinite' }}>\U0001F6E1\uFE0F</div>
         <h1 style={{ fontSize: '42px', margin: '0 0 12px 0', letterSpacing: '-0.5px' }}>Safe-Route <span style={{ color: '#3b82f6' }}>Navigator</span></h1>
         <p style={{ color: '#94a3b8', fontSize: '20px', fontWeight: 500 }}>Intelligent routing with real-time safety tracking</p>
      </div>
    );
  }

  return (
    <div className="app">'''

text = pattern.sub(replacement2, text)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
