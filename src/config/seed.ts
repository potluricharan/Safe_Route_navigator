import type { Hazard, HazardType, Severity } from "../types";
import { encodeGeohash } from "../lib/geohash";
import { computeExpiry } from "../services/scoring";

interface SeedSpec {
  id: string;
  type: HazardType;
  severity: Severity;
  lat: number;
  lng: number;
  ageHours: number;
  confirmations: number;
  denials: number;
  note: string;
}

/**
 * Clearly-labelled demonstration hazards around Benz Circle, Vijayawada.
 * These exist so the demo is never empty (cold-start mitigation) and every
 * one carries isDemoData: true so the UI can mark them as demonstration data.
 */
const SEED_SPECS: SeedSpec[] = [
  {
    id: "demo-lighting-underpass",
    type: "poor_lighting",
    severity: "high",
    lat: 16.5062,
    lng: 80.6525,
    ageHours: 30,
    confirmations: 3,
    denials: 0,
    note: "Underpass lights out; stretch is very dark after 8pm."
  },
  {
    id: "demo-waterlogging-junction",
    type: "waterlogging",
    severity: "high",
    lat: 16.511,
    lng: 80.642,
    ageHours: 2,
    confirmations: 2,
    denials: 0,
    note: "Ankle-deep water after rain at the junction."
  },
  {
    id: "demo-accident-busstop",
    type: "accident",
    severity: "medium",
    lat: 16.5002,
    lng: 80.6518,
    ageHours: 0.6,
    confirmations: 1,
    denials: 0,
    note: "Minor collision blocking one lane near the bus stop."
  },
  {
    id: "demo-road-damage-ne",
    type: "road_damage",
    severity: "medium",
    lat: 16.5125,
    lng: 80.654,
    ageHours: 120,
    confirmations: 1,
    denials: 0,
    note: "Broken patch near the centre median."
  },
  {
    id: "demo-isolated-southwest",
    type: "isolated_stretch",
    severity: "medium",
    lat: 16.4975,
    lng: 80.6405,
    ageHours: 12,
    confirmations: 2,
    denials: 1,
    note: "Quiet lane with little foot traffic or activity after dark."
  },
  {
    id: "demo-lighting-besant",
    type: "poor_lighting",
    severity: "medium",
    lat: 16.5032,
    lng: 80.6452,
    ageHours: 50,
    confirmations: 1,
    denials: 0,
    note: "Two street lamps not working on Besant Road stretch."
  },
  {
    id: "demo-obstruction-low",
    type: "temporary_obstruction",
    severity: "low",
    lat: 16.508,
    lng: 80.6462,
    ageHours: 0.4,
    confirmations: 0,
    denials: 0,
    note: "Vendor cart narrowing the footpath."
  }
];

export function seedHazards(now: number, raining = false): Hazard[] {
  return SEED_SPECS.map((s) => {
    const createdAt = now - s.ageHours * 3600_000;
    const updatedAt = createdAt;
    const expiresAt = computeExpiry(s.type, updatedAt, raining);
    return {
      id: s.id,
      type: s.type,
      severity: s.severity,
      lat: s.lat,
      lng: s.lng,
      geohash: encodeGeohash(s.lat, s.lng, 7),
      createdAt,
      updatedAt,
      expiresAt,
      status: "active" as const,
      confirmations: s.confirmations,
      denials: s.denials,
      confidence: Math.min(1, 0.5 + 0.12 * s.confirmations - 0.2 * s.denials),
      reporterId: "demo-seed",
      note: s.note,
      moderationStatus: "approved" as const,
      isDemoData: true
    };
  });
}