import io
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

initial = '''const [safePlacesList, setSafePlacesList] = useState<any[]>([
    { lat: 16.505, lon: 80.620, tags: { name: "Vijayawada General Hospital", amenity: "hospital" } },
    { lat: 16.512, lon: 80.615, tags: { name: "City Police Station", amenity: "police" } },
    { lat: 16.495, lon: 80.635, tags: { name: "24/7 Supermart", shop: "convenience", opening_hours: "24/7" } },
    { lat: 16.500, lon: 80.645, tags: { name: "Women's Hostel A", tourism: "hostel" } },
    { lat: 16.520, lon: 80.630, tags: { name: "Campus Security Main Gate", amenity: "university" } },
    { lat: 16.305, lon: 80.440, tags: { name: "Guntur General Hospital", amenity: "hospital" } },
    { lat: 16.310, lon: 80.445, tags: { name: "Guntur East Police Station", amenity: "police" } },
  ]);'''

text = text.replace('const [safePlacesList, setSafePlacesList] = useState<any[]>([]);', initial)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
