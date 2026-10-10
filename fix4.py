import io
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
text = re.sub(r'if \(window\.confi.*?\)\s*\{', 'if (window.confirm(Nearest Safe Place is m away!\\n\\n: \\n\\nWould you like to dial emergency services (100) now?)) {', text, flags=re.DOTALL)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
