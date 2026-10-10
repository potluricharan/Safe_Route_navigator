import type { HazardType, Severity, RouteMode } from "../types";

// Pilot zone: Vijayawada, centred on Benz Circle (16.5062, 80.6480).
export const CAMPUS: {
  name: string;
  center: [number, number];
  radiusKm: number;
  defaultZoom: number;
  landmarks: { name: string; lat: number; lng: number }[];
} = {
  name: "Vijayawada Pilot Zone",
  center: [16.5062, 80.648],
  radiusKm: 3,
  defaultZoom: 14,
  landmarks: [
    { name: "Benz Circle", lat: 16.5062, lng: 80.648 },
    { name: "M G Road", lat: 16.5109, lng: 80.6369 },
    { name: "Besant Road", lat: 16.5043, lng: 80.6435 },
    { name: "Governorpet", lat: 16.5089, lng: 80.6442 },
    { name: "Lenin Centre", lat: 16.5121, lng: 80.6559 },
    { name: "Bus Stand (PNBS)", lat: 16.5206, lng: 80.6191 },
    { name: "Kanuru", lat: 16.4785, lng: 80.6412 }
  ]
};

export interface HazardTypeRule {
  label: string;
  shortLabel: string;
  color: string;
  expiryHours: number | null; // null = long-lived, stays until resolved/reviewed
  temporary: boolean;
  rainExtends: boolean; // rainfall extends expiry and boosts relevance
  nightBoosts: boolean; // lighting-type hazards matter more at night
  icon: string;
  description: string;
}

export const HAZARD_TYPE_RULES: Record<HazardType, HazardTypeRule> = {
  poor_lighting: {
    label: "Poor lighting",
    shortLabel: "Lighting",
    color: "#d97706",
    expiryHours: null,
    temporary: false,
    rainExtends: false,
    nightBoosts: true,
    icon: "\u{1F4A1}",
    description: "Stays until reported fixed or reviewed"
  },
  waterlogging: {
    label: "Waterlogging",
    shortLabel: "Water",
    color: "#0284c7",
    expiryHours: 8,
    temporary: true,
    rainExtends: true,
    nightBoosts: false,
    icon: "\u{1F30A}",
    description: "Expires in hours unless reconfirmed; rain extends it"
  },
  accident: {
    label: "Accident / obstruction",
    shortLabel: "Accident",
    color: "#dc2626",
    expiryHours: 3,
    temporary: true,
    rainExtends: false,
    nightBoosts: false,
    icon: "\u{1F4A5}",
    description: "Expires in 2-3 hours unless reconfirmed"
  },
  temporary_obstruction: {
    label: "Temporary obstruction",
    shortLabel: "Obstruction",
    color: "#e11d48",
    expiryHours: 2.5,
    temporary: true,
    rainExtends: false,
    nightBoosts: false,
    icon: "\u{1F6A7}",
    description: "Expires in 2-3 hours unless reconfirmed"
  },
  road_damage: {
    label: "Road damage",
    shortLabel: "Damage",
    color: "#64748b",
    expiryHours: null,
    temporary: false,
    rainExtends: false,
    nightBoosts: false,
    icon: "\u{1F573}\uFE0F",
    description: "Stays until resolved or reviewed"
  },
  isolated_stretch: {
    label: "Isolated / concerning stretch",
    shortLabel: "Isolated",
    color: "#7c3aed",
    expiryHours: null,
    temporary: false,
    rainExtends: false,
    nightBoosts: true,
    icon: "\u{1F3DC}\uFE0F",
    description: "Long-lived, driven by confidence"
  }
};

export const SEVERITY_WEIGHTS: Record<Severity, number> = {
  low: 0.3,
  medium: 0.6,
  high: 1.0
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High"
};

/** Merge reports within this distance (m). */
export const DUPLICATE_DISTANCE_M = 25;
export const HAZARD_BUFFER_M = 30; // influence radius around route segments
export const SEGMENT_CHUNK_M = 60; // colour-banding resolution

export const RATE_LIMIT = {
  maxReportsPerHour: 50,
  maxVotesPerHazardPerUser: 1
};

export const MODE_WEIGHTS: Record<RouteMode, { time: number; risk: number }> = {
  fastest: { time: 0.85, risk: 0.15 },
  balanced: { time: 0.5, risk: 0.5 },
  lowerRisk: { time: 0.2, risk: 0.8 }
};

export const MODE_LABELS: Record<RouteMode, string> = {
  fastest: "Fastest",
  balanced: "Balanced",
  lowerRisk: "Lower estimated risk"
};

export const MODE_DESCRIPTIONS: Record<RouteMode, string> = {
  fastest: "Favours travel time. Risk still shown, just weighted lower.",
  balanced: "Time and estimated risk weighted equally.",
  lowerRisk: "Favours lower estimated risk. Not a guarantee of safety."
};

export const MAX_PHOTO_BYTES = 140_000; // resized before upload
export const PHOTO_MAX_EDGE = 640;