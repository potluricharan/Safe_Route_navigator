import { describe, expect, it } from "vitest";
import { decodeGeohash, encodeGeohash, sameCell } from "../lib/geohash";
import { isNight, sunTimesFor } from "../lib/sun";
import { haversineM, splitIntoChunks, distanceToPolylineM } from "../lib/geo";

describe("geohash", () => {
  it("round-trips a coordinate within its cell size", () => {
    const lat = 16.5062;
    const lng = 80.648;
    const hash = encodeGeohash(lat, lng, 7);
    const { lat: dLat, lng: dLng, latErr, lngErr } = decodeGeohash(hash);
    expect(Math.abs(dLat - lat)).toBeLessThanOrEqual(latErr);
    expect(Math.abs(dLng - lng)).toBeLessThanOrEqual(lngErr);
  });

  it("puts nearby points in the same cell at low precision", () => {
    const a = encodeGeohash(16.5062, 80.648, 5);
    const b = encodeGeohash(16.5063, 80.6481, 5);
    expect(sameCell(a, b, 5)).toBe(true);
  });
});

describe("day / night", () => {
  it("detects daytime and night-time in the pilot zone", () => {
    // 12:30 local (IST) = 07:00 UTC
    expect(isNight(16.5062, 80.648, new Date("2026-10-10T07:00:00Z"))).toBe(false);
    // 00:30 local next day = 19:00 UTC
    expect(isNight(16.5062, 80.648, new Date("2026-10-10T19:00:00Z"))).toBe(true);
  });

  it("returns ordered sunrise and sunset", () => {
    const t = sunTimesFor(16.5062, 80.648, new Date("2026-10-10T07:00:00Z"))!;
    expect(t).not.toBeNull();
    expect(t.sunrise.getTime()).toBeLessThan(t.sunset.getTime());
  });
});

describe("geometry", () => {
  it("measures a short distance sensibly", () => {
    const d = haversineM([16.5, 80.64], [16.501, 80.64]);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(120);
  });

  it("splits a route into chunks", () => {
    const pts: [number, number][] = [
      [16.5, 80.64],
      [16.502, 80.64],
      [16.504, 80.64],
      [16.506, 80.64]
    ];
    const chunks = splitIntoChunks(pts, 100);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0][0]).toEqual(pts[0]);
  });

  it("measures distance to a polyline in metres", () => {
    const line: [number, number][] = [
      [16.5, 80.64],
      [16.5, 80.66]
    ];
    // a point right on the line
    expect(distanceToPolylineM([16.5, 80.65], line)).toBeLessThan(5);
    // a point ~100 m north
    expect(distanceToPolylineM([16.5009, 80.65], line)).toBeGreaterThan(90);
  });
});