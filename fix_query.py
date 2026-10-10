import io, re
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

new_query = '''const query = [out:json][timeout:25];(
      nwr["amenity"="police"](16.48,80.60,16.55,80.68);
      nwr["amenity"="hospital"](16.48,80.60,16.55,80.68);
      nwr["shop"]["opening_hours"~"24/7"](16.48,80.60,16.55,80.68);
      nwr["tourism"="hostel"](16.48,80.60,16.55,80.68);
      nwr["amenity"="university"](16.48,80.60,16.55,80.68);
    );out center;;'''

text = re.sub(r'const query = \[out:json\].*?;out center;;', new_query, text)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
