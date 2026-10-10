import io, re

with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix the broken window.confirm
text = re.sub(r'window\.confi\?{3} Nearest Safe Place', 'window.confirm(Nearest Safe Place', text)

# Fix top-actions emojis
top_actions = '<div className="top-actions" style={{ display: \'flex\', gap: \'8px\' }}><button className="icon-btn" style={{ background: conditions.night ? \'#1e293b\' : \'\', color: conditions.night ? \'white\' : \'\' }} onClick={() => setDemoNight(!conditions.night)} title="Simulate Night">\U0001f319</button><button className="icon-btn" style={{ background: conditions.raining ? \'#3b82f6\' : \'\', color: conditions.raining ? \'white\' : \'\' }} onClick={() => setDemoRain(!conditions.raining)} title="Simulate Rain">\U0001f327\uFE0F</button><button className="icon-btn" style={{ background: showHeatmap ? \'#ef4444\' : \'\', color: showHeatmap ? \'white\' : \'\' }} onClick={() => setShowHeatmap(!showHeatmap)} title="Toggle Heatmap">\U0001f5fa\uFE0F</button><button className="icon-btn" style={{ background: showSafePlaces ? \'#10b981\' : \'\', color: showSafePlaces ? \'white\' : \'\' }} onClick={() => setShowSafePlaces(!showSafePlaces)} title="Toggle Safe Places">\U0001f6e1\uFE0F</button><button className="icon-btn" onClick={handleLocate} title="Use my location">\U0001f4cd</button><button className="icon-btn" onClick={() => setPanel((p) => (p === \'info\' ? \'routes\' : \'info\'))} title="How this works">\u2139\uFE0F</button></div>'
text = re.sub(r'<div className="top-actions".*?<\/div>', top_actions, text)

# Fix Nearest Safe Place button
text = re.sub(r'\?{3} Nearest Safe Place', '\U0001f6e1\uFE0F Nearest Safe Place', text)
text = re.sub(r'\?{2} Nearest Safe Place', '\U0001f6e1\uFE0F Nearest Safe Place', text)

# Fix brand lock
text = re.sub(r'<span className="brand-lock">\?{3}<\/span>', '<span className="brand-lock">\U0001f6e1\uFE0F</span>', text)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
