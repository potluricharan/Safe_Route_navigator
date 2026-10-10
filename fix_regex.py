import io, re
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

replacement = '''</span>
                {focusedHazard.note && (
                  <div style={{ padding: '4px 0', color: '#cbd5e1', fontSize: '14px', fontStyle: 'italic', fontWeight: 500 }}>
                    "{focusedHazard.note}"
                  </div>
                )}
                <span className="muted small">'''

text = re.sub(r'</span>\s*<span className="muted small">', replacement, text)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
