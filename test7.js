const query = `[out:json][timeout:25];(nwr["amenity"="police"](16.40,80.50,16.60,80.70);nwr["amenity"="hospital"](16.40,80.50,16.60,80.70);nwr["shop"]["opening_hours"~"24/7"](16.40,80.50,16.60,80.70);nwr["tourism"="hostel"](16.40,80.50,16.60,80.70);nwr["amenity"="university"](16.40,80.50,16.60,80.70););out center;`;
fetch('https://overpass-api.de/api/interpreter', { 
  method: 'POST', 
  body: query,
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'http://localhost:5173',
    'Referer': 'http://localhost:5173/'
  }
}).then(async res => {
   console.log('Status:', res.status);
   const data = await res.json();
   console.log('Elements:', data.elements ? data.elements.length : 0);
})
