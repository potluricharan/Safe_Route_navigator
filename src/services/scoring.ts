import {
  DUPLICATE_DISTANCE_M,
  HAZARD_BUFFER_M,
  MODE_WEIGHTS,
  SEGMENT_CHUNK_M,
  SEVERITY_LABELS,
  SEVERITY_WEIGHTS,
  HAZARD_TYPE_RULES
} from "../config/app";
import { distanceToPolylineM, splitIntoChunks } from "../lib/geo";
import type {
  Conditions,
  ConfidenceLabel,
  Hazard,
  HazardType,
  RouteCandidate,
  RouteEvaluation,
  RouteMode,
  SegmentScore,
  Severity,
  StaticFeature,
  Tier,
  TierLabel,
  HazardFactor,
  ScoringFactors
} from "../types";
import { SCORE_RULE_VERSION } from "../types";

const HOUR_MS = 3600_000;
const RAIN_GRACE_HOURS = 6; // rainfall extends temporary waterlogging this long
const SEGMENT_RISK_CAP = 2.5;
const TIER_AMBER = 0.18;
const TIER_RED = 0.6;

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* ------------------------------------------------------------------ */
/* Confidence & freshness                                              */
/* ------------------------------------------------------------------ */

/**
 * Confidence from community validation. Independent confirmations raise it,
 * denials lower it. A single unverified report sits at a neutral 0.5 baseline
 * and has a capped effect (robustness rule in the spec).
 */
export function confidenceFromVotes(confirmations: number, denials: number): number {
  const yes = 0.5 + 0.12 * Math.min(Math.max(confirmations, 0), 4);
  const penalty = 0.2 * Math.min(Math.max(denials, 0), 3);
  return clamp(yes - penalty, 0.15, 1.0);
}

/** Time-decay of a report's influence. Temporary hazards decay to 0.1 by expiry. */
export function freshness(hazard: Hazard, now: number): number {
  const rule = HAZARD_TYPE_RULES[hazard.type];
  const ageHours = Math.max(0, (now - hazard.updatedAt) / HOUR_MS);
  if (rule.temporary && hazard.expiresAt) {
    const windowHours = Math.max(0.5, (hazard.expiresAt - hazard.updatedAt) / HOUR_MS);
    const frac = clamp(ageHours / windowHours, 0, 1);
    return clamp(1 - 0.9 * frac, 0.1, 1);
  }
  // Long-lived hazards decay slowly so old reports never dominate.
  const frac = clamp(ageHours / (14 * 24), 0, 1);
  return clamp(1 - 0.8 * frac, 0.2, 1);
}

export function effectiveExpiry(hazard: Hazard, raining: boolean): number | null {
  if (hazard.expiresAt === null) return null;
  const rule = HAZARD_TYPE_RULES[hazard.type];
  if (raining && rule.rainExtends) {
    return hazard.expiresAt + RAIN_GRACE_HOURS * HOUR_MS;
  }
  return hazard.expiresAt;
}

export function isActive(hazard: Hazard, now: number, raining = false): boolean {
  if (hazard.status !== "active") return false;
  const exp = effectiveExpiry(hazard, raining);
  return exp === null || now < exp;
}

export function activeHazards(
  hazards: Hazard[],
  now: number,
  raining = false
): Hazard[] {
  return hazards.filter((h) => isActive(h, now, raining));
}

/** Expiry timestamp for a freshly reported / reconfirmed hazard. */
export function computeExpiry(
  type: HazardType,
  now: number,
  raining: boolean
): number | null {
  const rule = HAZARD_TYPE_RULES[type];
  if (rule.expiryHours === null) return null;
  const rainBonus = raining && rule.rainExtends ? RAIN_GRACE_HOURS : 0;
  return now + (rule.expiryHours + rainBonus) * HOUR_MS;
}

/* ------------------------------------------------------------------ */
/* Contribution math                                                   */
/* ------------------------------------------------------------------ */

function temporalMultiplier(
  type: HazardType,
  conditions: Conditions
): number {
  if (type === "poor_lighting") return conditions.night ? 1.0 : 0.5;
  if (type === "isolated_stretch") return conditions.night ? 1.0 : 0.6;
  if (type === "waterlogging") return conditions.raining ? 1.5 : 0.8;
  if (type === "road_damage") return conditions.raining ? 1.15 : 1.0;
  return 1.0;
}

export function hazardContribution(
  hazard: Hazard,
  conditions: Conditions,
  now: number
): { contribution: number; freshness: number; confidence: number } {
  const conf = confidenceFromVotes(hazard.confirmations, hazard.denials);
  const fresh = freshness(hazard, now);
  const base = SEVERITY_WEIGHTS[hazard.severity] * conf * fresh;
  const contribution = clamp(base * temporalMultiplier(hazard.type, conditions), 0, 1.5);
  return { contribution, freshness: fresh, confidence: conf };
}

interface SegmentContext {
  hazards: Hazard[];
  features: StaticFeature[];
  conditions: Conditions;
  now: number;
}

/** Context penalty/benefit applied to every segment (lighting, rainfall). */
export function contextPenalty(
  points: [number, number][],
  features: StaticFeature[],
  conditions: Conditions
): { penalty: number; reasons: string[] } {
  const reasons: string[] = [];
  let penalty = 0;

  if (conditions.raining) {
    penalty += 0.05;
  }

  if (conditions.night) {
    const lampsNearby = features.filter(
      (f) =>
        f.kind === "street_lamp" &&
        distanceToPolylineM([f.lat, f.lng], points) < HAZARD_BUFFER_M
    ).length;

    // Verified benefit: a mapped lamp nearby slightly reduces the lighting penalty.
    if (lampsNearby > 0) {
      penalty -= 0.1;
    } else if (features.some((f) => f.kind === "street_lamp")) {
      // Coverage exists but no lamp recorded here.
      penalty += 0.12;
      reasons.push("No street-lighting mapped on this stretch.");
    } else {
      // No lighting data at all: mark unknown, never assume safe or dangerous.
      penalty += 0.06;
      reasons.push(
        "Street-lighting data is unavailable here, so this stretch is marked unknown, not guaranteed safe."
      );
    }
  }

  return { penalty, reasons };
}

function tierFromRisk(risk: number, maxSeverity: Severity | null): Tier {
  if (risk >= TIER_RED || (maxSeverity === "high" && risk >= 0.35)) return "red";
  if (risk >= TIER_AMBER) return "amber";
  return "green";
}

export const TIER_LABELS: Record<Tier, TierLabel> = {
  green: "Lower estimated risk",
  amber: "Use caution",
  red: "Higher reported risk"
};

export function scoreSegment(
  points: [number, number][],
  ctx: SegmentContext
): SegmentScore {
  const reasons: string[] = [];
  let risk = 0;
  let maxSeverity: Severity | null = null;

  const sevRank: Record<Severity, number> = { low: 1, medium: 2, high: 3 };

  for (const h of ctx.hazards) {
    if (!isActive(h, ctx.now, ctx.conditions.raining)) continue;
    const d = distanceToPolylineM([h.lat, h.lng], points);
    if (d > HAZARD_BUFFER_M) continue;
    const { contribution, freshness: fresh, confidence } = hazardContribution(
      h,
      ctx.conditions,
      ctx.now
    );
    if (contribution <= 0) continue;
    risk += contribution;
    if (!maxSeverity || sevRank[h.severity] > sevRank[maxSeverity]) maxSeverity = h.severity;
    const rule = HAZARD_TYPE_RULES[h.type];
    const ageH = (ctx.now - h.createdAt) / HOUR_MS;
    reasons.push(
      `${SEVERITY_LABELS[h.severity]}-severity ${rule.label.toLowerCase()} reported ` +
        `${formatAge(ageH)}${confidence >= 0.6 ? " and confirmed" : ""}.`
    );
    // note: fresh used implicitly inside contribution
    void fresh;
  }

  const ctxPenalty = contextPenalty(points, ctx.features, ctx.conditions);
  risk += ctxPenalty.penalty;
  reasons.push(...ctxPenalty.reasons);

  risk = clamp(risk, 0, SEGMENT_RISK_CAP);
  const tier = tierFromRisk(risk, maxSeverity);

  return {
    points,
    risk,
    tier,
    label: TIER_LABELS[tier],
    reasons: dedupe(reasons),
    share: 0
  };
}

/* ------------------------------------------------------------------ */
/* Route evaluation                                                    */
/* ------------------------------------------------------------------ */

export function evaluateRoute(
  route: RouteCandidate,
  hazards: Hazard[],
  features: StaticFeature[],
  conditions: Conditions,
  mode: RouteMode,
  now: number
): RouteEvaluation {
  const chunks = splitIntoChunks(route.geometry, SEGMENT_CHUNK_M);
  const segmentCount = Math.max(1, chunks.length);

  const segments: SegmentScore[] = chunks.map((pts) => {
    const s = scoreSegment(pts, { hazards, features, conditions, now });
    return { ...s, share: 1 / segmentCount };
  });

  const meanRisk = segments.reduce((a, s) => a + s.risk, 0) / segmentCount;
  const maxRisk = segments.reduce((a, s) => Math.max(a, s.risk), 0);
  const exposure = segments.filter((s) => s.tier !== "green").length / segmentCount;

  const lengthFactor = 1 + 0.03 * route.distanceKm;
  const rawRisk = (0.5 * meanRisk + 0.5 * maxRisk) * lengthFactor;
  const riskIndex = Math.round(clamp(rawRisk / 1.2, 0, 1) * 100);

  const hazardFactors: HazardFactor[] = [];
  for (const h of hazards) {
    if (!isActive(h, now, conditions.raining)) continue;
    const d = distanceToPolylineM([h.lat, h.lng], route.geometry);
    if (d > HAZARD_BUFFER_M) continue;
    const { contribution, freshness: fresh, confidence } = hazardContribution(
      h,
      conditions,
      now
    );
    hazardFactors.push({
      hazardId: h.id,
      type: h.type,
      severity: h.severity,
      distanceM: Math.round(d),
      contribution,
      freshness: fresh,
      confidence,
      ageHours: (now - h.createdAt) / HOUR_MS
    });
  }
  hazardFactors.sort((a, b) => b.contribution - a.contribution);

  const lightingCoverage: "available" | "unknown" = features.some(
    (f) => f.kind === "street_lamp"
  )
    ? "available"
    : "unknown";

  const factorSummary: ScoringFactors = {
    hazards: hazardFactors,
    context: {
      night: conditions.night,
      raining: conditions.raining,
      precipitationMmh: conditions.precipitationMmh,
      lightingCoverage
    },
    lengthKm: route.distanceKm,
    mode
  };

  const reasons = buildReasons({
    segments,
    hazardFactors,
    exposure,
    conditions,
    lightingCoverage
  });

  return {
    route,
    riskIndex,
    segments,
    confidence: confidenceLabel(hazardFactors, exposure, lightingCoverage),
    reasons,
    factorSummary,
    ruleVersion: SCORE_RULE_VERSION,
    computedAt: now
  };
}

export function buildReasons(ctx: {
  segments: SegmentScore[];
  hazardFactors: HazardFactor[];
  exposure: number;
  conditions: Conditions;
  lightingCoverage: "available" | "unknown";
}): string[] {
  const reasons: string[] = [];
  const { hazardFactors, exposure, conditions, lightingCoverage } = ctx;

  // Top contributing hazards (max 2), always tied to an actual scoring factor.
  for (const f of hazardFactors.slice(0, 2)) {
    if (f.contribution < 0.05) continue;
    const rule = HAZARD_TYPE_RULES[f.type];
    reasons.push(
      `Passes a ${SEVERITY_LABELS[f.severity].toLowerCase()}-severity ${rule.label.toLowerCase()}` +
        ` report about ${formatAge(f.ageHours)} ago (${f.confidence >= 0.6 ? "confirmed" : "not yet confirmed"}).`
    );
  }

  if (exposure >= 0.34) {
    reasons.push(
      `About ${Math.round(exposure * 100)}% of this route passes near active report(s).`
    );
  }

  if (conditions.night && lightingCoverage === "unknown") {
    reasons.push("Night-time and street-lighting data is missing; this is marked unknown, not safe.");
  } else if (conditions.night) {
    reasons.push("Night-time: lighting-related reports are weighted higher.");
  }

  if (conditions.raining) {
    reasons.push("Rain detected: waterlogging and road-damage reports are weighted higher.");
  }

  if (hazardFactors.length === 0 && lightingCoverage === "available") {
    reasons.push("No active reports on this route; map data coverage is available here.");
  } else if (hazardFactors.length === 0) {
    reasons.push("No active reports, but data coverage here is thin.");
  }

  if (reasons.length === 0) {
    reasons.push("No notable risk factors detected in the available data.");
  }
  return dedupe(reasons).slice(0, 4);
}

export function confidenceLabel(
  hazardFactors: HazardFactor[],
  _exposure: number,
  lightingCoverage: "available" | "unknown"
): ConfidenceLabel {
  // If there are hazards on the route, our confidence in the route's safety and ETA decreases
  if (hazardFactors.length > 0) {
    const hasHighSeverity = hazardFactors.some((f) => f.severity === "high");
    return hasHighSeverity ? "low" : "limited";
  }
  
  // If no hazards are reported on the route, confidence is high (or medium if lighting is unknown)
  return lightingCoverage === "available" ? "high" : "medium";
}

/* ------------------------------------------------------------------ */
/* Ranking & comparative explanations                                  */
/* ------------------------------------------------------------------ */

export interface RankedRoute extends RouteEvaluation {
  rank: number;
  combinedScore: number;
}

export function rankRoutes(
  evaluations: RouteEvaluation[],
  mode: RouteMode
): RankedRoute[] {
  if (evaluations.length === 0) return [];
  const w = MODE_WEIGHTS[mode];
  const times = evaluations.map((e) => e.route.durationMin);
  const risks = evaluations.map((e) => e.riskIndex);
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const rMin = Math.min(...risks);
  const rMax = Math.max(...risks);
  const norm = (v: number, lo: number, hi: number) =>
    hi === lo ? 0 : (v - lo) / (hi - lo);

  const ranked = evaluations
    .map((e) => {
      const tN = norm(e.route.durationMin, tMin, tMax);
      const rN = norm(e.riskIndex, rMin, rMax);
      return {
        ...e,
        rank: 0,
        combinedScore: w.time * tN + w.risk * rN
      } as RankedRoute;
    })
    .sort((a, b) => a.combinedScore - b.combinedScore);

  ranked.forEach((r, i) => (r.rank = i + 1));

  // Comparative, mode-aware explanations.
  const fastestTime = Math.min(...evaluations.map((e) => e.route.durationMin));
  const lowestRisk = Math.min(...evaluations.map((e) => e.riskIndex));
  for (const r of ranked) {
    const extra = r.route.durationMin - fastestTime;
    if (r.route.durationMin === fastestTime && r.rank === 1 && mode === "fastest") {
      r.reasons.push("This is the fastest option.");
    }
    if (r.riskIndex === lowestRisk && mode === "lowerRisk") {
      r.reasons.push(
        extra > 0.5
          ? `Lowest estimated risk; takes about ${Math.round(extra)} min longer than the fastest route.`
          : "Lowest estimated risk and about as fast as the fastest route."
      );
    }
    if (mode === "lowerRisk" && r.confidence === "limited") {
      r.reasons.push("Data is limited on this route, so treat the estimate with caution.");
    }
    r.reasons = r.reasons.slice(0, 4);
  }

  return ranked;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function formatAge(hours: number): string {
  if (hours < 1 / 60) return "just now";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

export function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function duplicatesOf(
  candidate: { lat: number; lng: number; type: HazardType },
  existing: Hazard[],
  now: number,
  raining = false
): Hazard | null {
  for (const h of existing) {
    if (h.type !== candidate.type) continue;
    if (!isActive(h, now, raining)) continue;
    const d =
      Math.hypot(
        (h.lat - candidate.lat) * 111320,
        (h.lng - candidate.lng) * 111320 * Math.cos((candidate.lat * Math.PI) / 180)
      );
    if (d <= DUPLICATE_DISTANCE_M) return h;
  }
  return null;
}