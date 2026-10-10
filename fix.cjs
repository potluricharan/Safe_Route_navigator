const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /<div className="top-actions".*?<\/div>/,
  '<div className="top-actions" style={{ display: \'flex\', gap: \'8px\' }}><button className="icon-btn" style={{ background: conditions.night ? \'#1e293b\' : \'\', color: conditions.night ? \'white\' : \'\' }} onClick={() => setDemoNight(!conditions.night)} title="Simulate Night">??</button><button className="icon-btn" style={{ background: conditions.raining ? \'#3b82f6\' : \'\', color: conditions.raining ? \'white\' : \'\' }} onClick={() => setDemoRain(!conditions.raining)} title="Simulate Rain">???</button><button className="icon-btn" style={{ background: showHeatmap ? \'#ef4444\' : \'\', color: showHeatmap ? \'white\' : \'\' }} onClick={() => setShowHeatmap(!showHeatmap)} title="Toggle Heatmap">???</button><button className="icon-btn" style={{ background: showSafePlaces ? \'#10b981\' : \'\', color: showSafePlaces ? \'white\' : \'\' }} onClick={() => setShowSafePlaces(!showSafePlaces)} title="Toggle Safe Places">???</button><button className="icon-btn" onClick={handleLocate} title="Use my location">??</button><button className="icon-btn" onClick={() => setPanel((p) => (p === \'info\' ? \'routes\' : \'info\'))} title="How this works">??</button></div>'
);

code = code.replace(/\?\?\? Nearest Safe Place/, '??? Nearest Safe Place');
code = code.replace(/setToast\("New hazard reported! Route scores updated. \?\?"\);/, 'setToast("New hazard reported! Route scores updated. ??");');

fs.writeFileSync('src/App.tsx', code, 'utf8');
