const query = `[out:json][timeout:25];(nwr["amenity"="police"](16.40,80.50,16.60,80.70);nwr["amenity"="hospital"](16.40,80.50,16.60,80.70);nwr["shop"]["opening_hours"~"24/7"](16.40,80.50,16.60,80.70);nwr["tourism"="hostel"](16.40,80.50,16.60,80.70);nwr["amenity"="university"](16.40,80.50,16.60,80.70););out center;`;
fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Mozilla/5.0'
  },
  body: 'data=' + encodeURIComponent(query)
})
  .then(async res => {
     console.log('Status:', res.status);
     const text = await res.text();
     console.log(text.substring(0, 100));
  })
  .catch(err => console.error(err));
