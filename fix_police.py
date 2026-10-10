import io, re
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Change Overpass query to only Police
text = re.sub(r'\(nwr\["amenity"="police"\].*?\);\);out center;', '(nwr["amenity"="police"](16.49,80.63,16.53,80.67););out center;', text)

# 2. Add 500m check
new_dist_check = '''const distMeters = Math.round(minDist * 111320);
    if (distMeters > 500 || !closest) {
       alert("No Police Stations found within a 500m radius.");
       return;
    }
    const isPolice = true;'''
text = re.sub(r'const distMeters = Math\.round\(minDist \* 111320\);\s*const isPolice = .*?;', new_dist_check, text, flags=re.DOTALL)

# 3. Change "Nearest Safe Place" to "Nearest Police Station" in Button
text = re.sub(r'\U0001f6e1\uFE0F Nearest Safe Place', '?? Nearest Police Station', text)

# 4. Change Modal Title
text = re.sub(r'<h2.*?>Nearest Safe Place<\/h2>', '<h2 style={{ margin: "0 0 8px 0", color: "#f8fafc" }}>Nearest Police Station</h2>', text)

# 5. Change "typeStr" default since it's only police now
text = re.sub(r'const typeStr = isPolice \? "Police Station" : .*?;', 'const typeStr = "Police Station";', text)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
