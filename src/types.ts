export type HazardType =
  | "poor_lighting"
  | "waterlogging"
  | "accident"
  | "road_damage"
  | "temporary_obstruction"
  | "isolated_stretch";

export type Severity = "low" | "medium" | "high";

export type HazardStatus =
  | "active"
  | "expired"
  | "resolved"
  | "under_review"
  | "merged_into";

export type ModerationStatus = "pending" | "approved" | "rejected";

export interface Vote {
  id: string;
  hazardId: string;
  voterKey: string;
  vote: "yes" | "no";
  timestamp: number;
}

export interface Hazard {
  id: string;
  type: HazardType;
  severity: Severity;
  lat: number;
  lng: number;
  geohash: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number | null;
  status: HazardStatus;
  confirmations: number;
  denials: number;
  confidence: number;
  reporterId: string;
  note?: string;
  photoUrl?: string;
  moderationStatus: ModerationStatus;
  mergedInto?: string;
  /** set when the seed/demo dataset is the source, so users know this is a demo */
  isDemoData?: boolean;
}

export interface UserTrust {
  reportCount: number;
  confirmedShare: number;
  rateLimitedUntil: number | null;
  updatedAt: number;
}

export interface StaticFeature {
  id: string;
  kind: "street_lamp" | "road" | "amenity";
  lat: number;
  lng: number;
  meta: Record<string, string | number | boolean>;
  source: "osm" | "demo";
}

export interface RouteCandidate {
  id: string;
  provider: "osrm" | "ors";
  kind: "plain" | "avoid_hazards";
  geometry: [number, number][];
  distanceKm: number;
  durationMin: number;
}

export interface RouteEvaluation {
  route: RouteCandidate;
  riskIndex: number; // 0..100 presentation score
  segments: SegmentScore[];
  confidence: ConfidenceLabel;
  reasons: string[];
  factorSummary: ScoringFactors;
  ruleVersion: string;
  computedAt: number;
}

export type Tier = "green" | "amber" | "red";

export type ConfidenceLabel = "limited" | "low" | "medium" | "high";

export interface SegmentScore {
  points: [number, number][];
  risk: number;
  tier: Tier;
  label: TierLabel;
  reasons: string[];
  /** distance share of this segment in the whole route */
  share: number;
}

export type TierLabel = "Lower estimated risk" | "Use caution" | "Higher reported risk";

export interface ScoringFactors {
  hazards: HazardFactor[];
  context: {
    night: boolean;
    raining: boolean;
    precipitationMmh: number;
    lightingCoverage: "available" | "unknown";
  };
  lengthKm: number;
  mode: RouteMode;
}

export interface HazardFactor {
  hazardId: string;
  type: HazardType;
  severity: Severity;
  distanceM: number;
  contribution: number;
  freshness: number;
  confidence: number;
  ageHours: number;
}

export type RouteMode = "fastest" | "balanced" | "lowerRisk";

export interface Conditions {
  night: boolean;
  raining: boolean;
  precipitationMmh: number;
  fetchedAt: number;
  sourceWarning?: string;
}

export interface RouteRequest {
  start: [number, number];
  destination: [number, number];
  mode: RouteMode;
  conditions: Conditions;
  now?: number;
}

export interface HazardFilter {
  bbox?: { minLat: number; minLng: number; maxLat: number; maxLng: number };
  status?: HazardStatus;
}

/** Common interface for both the local demo provider and Firestore. */
export interface DataProvider {
  readonly name: string;
  initialize(): Promise<void>;
  listHazards(filter?: HazardFilter): Promise<Hazard[]>;
  addHazard(input: NewHazard): Promise<AddHazardResult>;
  vote(hazardId: string, vote: "yes" | "no"): Promise<void>;
  onHazardsChanged(listener: (hazards: Hazard[]) => void): () => void;
  getTrust(userId: string): Promise<UserTrust | null>;
  ready: boolean;
}

export interface NewHazard {
  type: HazardType;
  severity: Severity;
  lat: number;
  lng: number;
  note?: string;
  photoDataUrl?: string;
  reporterId: string;
}

export type AddHazardResult =
  | { ok: true; hazard: Hazard; mergedInto?: string }
  | { ok: false; reason: "rate_limited" | "duplicate" | "rejected"; message: string };

export const SCORE_RULE_VERSION = "rule-v1.0.0";