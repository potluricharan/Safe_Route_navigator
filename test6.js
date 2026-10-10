const q1 = `[out:json][timeout:25];(nwr["amenity"="police"](16.49,80.63,16.53,80.67););out center;`;
fetch('https://overpass-api.de/api/interpreter', { 
  method: 'POST', 
  body: q1,
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'http://localhost:5173',
    'Referer': 'http://localhost:5173/'
  }
}).then(res => console.log(res.status))
