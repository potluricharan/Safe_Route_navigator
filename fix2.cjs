const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/(\?+)\s*Nearest Safe Place/, '??? Nearest Safe Place');
fs.writeFileSync('src/App.tsx', code, 'utf8');
