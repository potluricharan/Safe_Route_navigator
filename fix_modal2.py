import io, re
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's clean up the corrupted function
new_handler = '''const handleNearestSafePlace = () => {
    if (safePlacesList.length === 0) {
       alert("Still loading safe places from map data...");
       return;
    }
    // Find closest to contextPoint
    let closest = safePlacesList[0];
    let minDist = Infinity;
    safePlacesList.forEach(p => {
       const d = Math.sqrt(Math.pow((p.lat ?? p.center?.lat) - contextPoint[0], 2) + Math.pow((p.lon ?? p.center?.lon) - contextPoint[1], 2));
       if (d < minDist) { minDist = d; closest = p; }
    });
    
    const distMeters = Math.round(minDist * 111320);
    const isPolice = closest.tags?.amenity === "police";
    const typeStr = isPolice ? "Police Station" : (closest.tags?.amenity === "hospital" ? "Hospital" : "24/7 Safe Shop");
    const name = closest.tags?.name || "Unknown";
    
    setSosPlace({ place: closest, distMeters, typeStr, name });
  };'''

text = re.sub(r'const handleNearestSafePlace = \(\) => \{.*?window\.location\.href = "tel:100";\n    \}\n  \};', new_handler, text, flags=re.DOTALL)
text = re.sub(r'const handleNearestSafePlace = \(\) => \{.*?setSosPlace\(\{ place: closest, distMeters, typeStr, name \}\);\n    \};\n      // Find closest to contextPoint.*?  \};', new_handler, text, flags=re.DOTALL)


with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
