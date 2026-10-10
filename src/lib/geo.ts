const EARTH_RADIUS_M = 6371008.8;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Great-circle distance in metres. */
export function haversineM(
  a: [number, number],
  b: [number, number]
): number {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function bearingDeg(a: [number, number], b: [number, number]): number {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Total length of a [lat,lng] polyline in metres. */
export function lineLengthM(points: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineM(points[i - 1], points[i]);
  return total;
}

/** Shortest distance from a point to a polyline segment, in metres (planar approx is fine at 30 m scale). */
export function distanceToSegmentM(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): number {
  const latRef = p[0];
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(toRad(latRef));
  const px = p[1] * mPerDegLng;
  const py = p[0] * mPerDegLat;
  const ax = a[1] * mPerDegLng;
  const ay = a[0] * mPerDegLat;
  const bx = b[1] * mPerDegLng;
  const by = b[0] * mPerDegLat;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Minimum distance from point to any vertex of a polyline (cheap upper bound helper). */
export function distanceToPolylineM(
  p: [number, number],
  points: [number, number][]
): number {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const d = distanceToSegmentM(p, points[i], points[i + 1]);
    if (d < best) best = d;
  }
  if (points.length === 1) best = haversineM(p, points[0]);
  return best;
}

/**
 * Split a polyline into consecutive chunks of roughly `chunkM` metres.
 * Used to colour-code route stretches at the segment level.
 */
export function splitIntoChunks(
  points: [number, number][],
  chunkM = 60
): [number, number][][] {
  if (points.length < 2) return points.length ? [[points[0], points[0]]] : [];
  const chunks: [number, number][][] = [];
  let current: [number, number][] = [points[0]];
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const segLen = haversineM(points[i - 1], points[i]);
    acc += segLen;
    current.push(points[i]);
    if (acc >= chunkM) {
      chunks.push(current);
      current = [points[i]];
      acc = 0;
    }
  }
  if (current.length > 1) chunks.push(current);
  return chunks;
}

const BBOX_MARGIN_DEG = 0.0005; // ~55 m, used for viewport padding

export function bboxAround(
  center: [number, number],
  radiusM: number
): { minLat: number; minLng: number; maxLat: number; maxLng: number } {
  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.cos(toRad(center[0])));
  return {
    minLat: center[0] - dLat,
    minLng: center[1] - dLng + BBOX_MARGIN_DEG,
    maxLat: center[0] + dLat,
    maxLng: center[1] + dLng - BBOX_MARGIN_DEG
  };
}

export function bboxContains(
  box: { minLat: number; minLng: number; maxLat: number; maxLng: number },
  p: [number, number]
): boolean {
  return p[0] >= box.minLat && p[0] <= box.maxLat && p[1] >= box.minLng && p[1] <= box.maxLng;
}

export function bboxOfPoints(points: [number, number][]): {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
} {
  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;
  for (const [lat, lng] of points) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  return { minLat, minLng, maxLat, maxLng };
}
