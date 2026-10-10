import io, re
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace contextPoint with (start || contextPoint) in distance calculation
text = re.sub(r'const d = Math\.sqrt\(Math\.pow\(\(p\.lat \?\? p\.center\?\.lat\) - contextPoint\[0\], 2\) \+ Math\.pow\(\(p\.lon \?\? p\.center\?\.lon\) - contextPoint\[1\], 2\)\);', 
              'const origin = start || contextPoint;\n       const d = Math.sqrt(Math.pow((p.lat ?? p.center?.lat) - origin[0], 2) + Math.pow((p.lon ?? p.center?.lon) - origin[1], 2));', 
              text)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
