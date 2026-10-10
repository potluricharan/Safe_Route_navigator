const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

/**
 * Standard geohash encoder. Precision 7 is ~153m x 153m, which matches the
 * "merge likely duplicates within ~25 m" support and lets Firestore query a
 * viewport by geohash prefix instead of scanning the whole collection.
 */
export function encodeGeohash(lat: number, lng: number, precision = 7): string {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let hash = "";
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;

  while (hash.length < precision) {
    if (evenBit) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        idx = idx * 2 + 1;
        lngMin = mid;
      } else {
        idx = idx * 2;
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        idx = idx * 2 + 1;
        latMin = mid;
      } else {
        idx = idx * 2;
        latMax = mid;
      }
    }
    evenBit = !evenBit;
    if (++bit === 5) {
      hash += BASE32[idx];
      bit = 0;
      idx = 0;
    }
  }
  return hash;
}

export function decodeGeohash(hash: string): {
  lat: number;
  lng: number;
  latErr: number;
  lngErr: number;
} {
  let evenBit = true;
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;

  for (const c of hash) {
    const cd = BASE32.indexOf(c);
    if (cd === -1) continue;
    for (let mask = 16; mask > 0; mask >>= 1) {
      if (evenBit) {
        const mid = (lngMin + lngMax) / 2;
        if (cd & mask) lngMin = mid;
        else lngMax = mid;
      } else {
        const mid = (latMin + latMax) / 2;
        if (cd & mask) latMin = mid;
        else latMax = mid;
      }
      evenBit = !evenBit;
    }
  }
  return {
    lat: (latMin + latMax) / 2,
    lng: (lngMin + lngMax) / 2,
    latErr: (latMax - latMin) / 2,
    lngErr: (lngMax - lngMin) / 2
  };
}

/** True when two geohashes cover the same cell at the given precision. */
export function sameCell(a: string, b: string, precision = 7): boolean {
  return a.slice(0, precision) === b.slice(0, precision);
}
