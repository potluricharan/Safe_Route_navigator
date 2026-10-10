$query = '[out:json][timeout:25];(nwr["amenity"="police"](16.40,80.50,16.60,80.70););out center;'
Invoke-RestMethod -Uri 'https://overpass-api.de/api/interpreter' -Method Post -Body $query
