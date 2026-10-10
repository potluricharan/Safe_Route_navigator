import io
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix background
text = text.replace("background: 'white', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', margin: '0 -16px 12px -16px'", 
                    "background: 'transparent', padding: '12px 16px', borderBottom: '1px solid #334155', margin: '0 -16px 12px -16px'")

# Fix text/icon color based on isSelected
target_div = "style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', opacity: isSelected ? 1 : 0.4, transition: '0.2s', width: '33%' }}"
replacement_div = "style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', opacity: isSelected ? 1 : 0.4, transition: '0.2s', width: '33%', color: isSelected ? 'white' : '#94a3b8' }}"
text = text.replace(target_div, replacement_div)

# Fix eta text color which was hardcoded
target_eta = "color: isSelected ? '#1e293b' : '#64748b'"
replacement_eta = "color: isSelected ? 'white' : '#94a3b8'"
text = text.replace(target_eta, replacement_eta)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
