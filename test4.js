const query = `[out:json][timeout:25];(nwr["amenity"="police"](16.49,80.63,16.53,80.67););out center;`;
fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: query })
  .then(async res => console.log('Status:', res.status))
  .catch(err => console.error(err));
