import { describe, expect, it } from "vitest";
import {
  activeHazards,
  confidenceFromVotes,
  confidenceLabel,
  computeExpiry,
  duplicatesOf,
  effectiveExpiry,
  evaluateRoute,
  freshness,
  isActive,
  rankRoutes
} from "./scoring";
import { buildReasons } from "./scoring";
import { seedHazards } from "../config/seed";
import { HAZARD_TYPE_RULES, MODE_WEIGHTS } from "../config/app";
import type { Conditions, Hazard, RouteCandidate } from "../types";

const NOW = Date.UTC(2026, 9, 10, 12, 0, 0);
const HOUR = 3600_000;

function makeHazard(overrides: Partial<Hazard> = {}): Hazard {
  const base: Hazard = {
    id: "h1",
    type: "accident",
    severity: "high",
    lat: 16.5,
    lng: 80.65,
    geohash: "tdr",
    createdAt: NOW,
    updatedAt: NOW,
    expiresAt: NOW + 3 * HOUR,
    status: "active",
    confirmations: 0,
    denials: 0,
    confidence: 0.5,
    reporterId: "tester",
    moderationStatus: "approved"
  };
  return { ...base, ...overrides };
}

const DRY_DAY: Conditions = {
  night: false,
  raining: false,
  precipitationMmh: 0,
  fetchedAt: NOW
};
const NIGHT_DRY: Conditions = { ...DRY_DAY, night: true };
const DAY_RAIN: Conditions = { ...DRY_DAY, raining: true, precipitationMmh: 2 };

function straightRoute(
  id: string,
  from: [number, number],
  to: [number, number],
  durationMin = 10,
  distanceKm = 1
): RouteCandidate {
  const steps = 8;
  const geometry: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    geometry.push([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]);
  }
  return {
    id,
    provider: "osrm",
    kind: "plain",
    geometry,
    distanceKm,
    durationMin
  };
}

describe("freshness and expiry", () => {
  it("decays temporary hazards toward zero by expiry", () => {
    const h = makeHazard({
      type: "waterlogging",
      createdAt: NOW - HOUR,
      updatedAt: NOW - HOUR,
      expiresAt: NOW + HOUR
    });
    const f = freshness(h, NOW);
    expect(f).toBeGreaterThan(0.4);
    expect(f).toBeLessThan(0.7);

    const atExpiry = freshness(
      { ...h, updatedAt: NOW - 2 * HOUR, expiresAt: NOW },
      NOW
    );
    expect(atExpiry).toBeCloseTo(0.1, 5);
  });

  it("keeps long-lived hazards relevant but slowly decaying", () => {
    const h = makeHazard({
      type: "poor_lighting",
      updatedAt: NOW - 7 * 24 * HOUR,
      expiresAt: null
    });
    const f = freshness(h, NOW);
    expect(f).toBeCloseTo(0.6, 1);
  });

  it("applies the configured expiry window per hazard type", () => {
    expect(computeExpiry("waterlogging", NOW, false)).toBe(NOW + 8 * HOUR);
    expect(computeExpiry("accident", NOW, false)).toBe(NOW + 3 * HOUR);
    expect(computeExpiry("temporary_obstruction", NOW, false)).toBe(NOW + 2.5 * HOUR);
    expect(computeExpiry("poor_lighting", NOW, false)).toBeNull();
    expect(HAZARD_TYPE_RULES.road_damage.expiryHours).toBeNull();
  });

  it("rainfall extends a waterlogging hazard's effective expiry", () => {
    const h = makeHazard({ type: "waterlogging", expiresAt: NOW + HOUR });
    const extended = effectiveExpiry(h, true);
    expect(extended).toBe((NOW + HOUR) + 6 * HOUR);
    // ...but not for types that rain does not extend
    const accident = makeHazard({ expiresAt: NOW + HOUR });
    expect(effectiveExpiry(accident, true)).toBe(NOW + HOUR);
  });

  it("treats expired and non-active hazards as inactive", () => {
    const expired = makeHazard({ expiresAt: NOW - HOUR });
    expect(isActive(expired, NOW, false)).toBe(false);
    const resolved = makeHazard({ status: "resolved" });
    expect(isActive(resolved, NOW, false)).toBe(false);
    const rainKept = makeHazard({ type: "waterlogging", expiresAt: NOW - HOUR });
    expect(isActive(rainKept, NOW, true)).toBe(true);

    const list = [expired, resolved, makeHazard({ id: "ok" })];
    expect(activeHazards(list, NOW, false)).toHaveLength(1);
  });
});

describe("confidence from community validation", () => {
  it("starts neutral and rises with independent confirmations", () => {
    expect(confidenceFromVotes(0, 0)).toBeCloseTo(0.5);
    expect(confidenceFromVotes(3, 0)).toBeCloseTo(0.86);
  });

  it("caps the effect of repeated confirmations (robustness)", () => {
    expect(confidenceFromVotes(50, 0)).toBeCloseTo(0.98);
  });

  it("lowers confidence on denials", () => {
    expect(confidenceFromVotes(1, 2)).toBeCloseTo(0.22);
  });
});

describe("duplicate merging", () => {
  it("flags a same-type report within 25 m as a duplicate", () => {
    const existing = makeHazard({ type: "waterlogging", lat: 16.5, lng: 80.65 });
    const near = { lat: 16.5001, lng: 80.65, type: "waterlogging" as const };
    expect(duplicatesOf(near, [existing], NOW)).not.toBeNull();
  });

  it("does not merge across types or distance", () => {
    const existing = makeHazard({ type: "waterlogging", lat: 16.5, lng: 80.65 });
    expect(
      duplicatesOf({ lat: 16.5001, lng: 80.65, type: "accident" }, [existing], NOW)
    ).toBeNull();
    expect(
      duplicatesOf({ lat: 16.52, lng: 80.68, type: "waterlogging" }, [existing], NOW)
    ).toBeNull();
  });

  it("ignores inactive hazards when merging", () => {
    const expired = makeHazard({
      type: "waterlogging",
      lat: 16.5,
      lng: 80.65,
      expiresAt: NOW - HOUR
    });
    expect(
      duplicatesOf({ lat: 16.5001, lng: 80.65, type: "waterlogging" }, [expired], NOW)
    ).toBeNull();
  });
});

describe("route evaluation and ranking", () => {
  const corridorStart: [number, number] = [16.5, 80.64];
  const corridorEnd: [number, number] = [16.51, 80.66];

  it("assigns higher risk to the route that passes a confirmed hazard", () => {
    const risky = straightRoute("risky", corridorStart, corridorEnd);
    const clean = straightRoute("clean", [16.5, 80.68], [16.51, 80.7]);
    const onRoute = makeHazard({
      type: "accident",
      severity: "high",
      lat: 16.505,
      lng: 80.65,
      confirmations: 3,
      denials: 0
    });

    const riskyEval = evaluateRoute(risky, [onRoute], [], DRY_DAY, "balanced", NOW);
    const cleanEval = evaluateRoute(clean, [], [], DRY_DAY, "balanced", NOW);

    expect(riskyEval.riskIndex).toBeGreaterThan(cleanEval.riskIndex);
    expect(cleanEval.riskIndex).toBe(0);
    const riskiestTier = riskyEval.segments.map((s) => s.tier);
    expect(riskiestTier).toContain("red");
  });

  it("moves the lower-risk estimate toward the safe route on controlled tests", () => {
    const fastRisky = straightRoute("fast", corridorStart, corridorEnd, 10, 1);
    const slowSafe = straightRoute("safe", [16.5, 80.68], [16.51, 80.7], 15, 1.4);
    const onRoute = makeHazard({
      severity: "high",
      type: "accident",
      lat: 16.505,
      lng: 80.65,
      confirmations: 2
    });
    const evals = [
      evaluateRoute(fastRisky, [onRoute], [], DRY_DAY, "lowerRisk", NOW),
      evaluateRoute(slowSafe, [], [], DRY_DAY, "lowerRisk", NOW)
    ];
    const ranked = rankRoutes(evals, "lowerRisk");
    expect(ranked[0].route.id).toBe("safe");

    const rankedFast = rankRoutes(
      [
        evaluateRoute(fastRisky, [onRoute], [], DRY_DAY, "fastest", NOW),
        evaluateRoute(slowSafe, [], [], DRY_DAY, "fastest", NOW)
      ],
      "fastest"
    );
    expect(rankedFast[0].route.id).toBe("fast");
  });

  it("weights time and risk to sum to 1 in every mode", () => {
    for (const m of ["fastest", "balanced", "lowerRisk"] as const) {
      expect(MODE_WEIGHTS[m].time + MODE_WEIGHTS[m].risk).toBeCloseTo(1);
    }
  });
});

describe("explainability", () => {
  it("produces reasons that reference the actual scoring factors", () => {
    const route = straightRoute("r", [16.5, 80.64], [16.51, 80.66]);
    const hazard = makeHazard({ lat: 16.505, lng: 80.65, confirmations: 2 });
    const evaluation = evaluateRoute(route, [hazard], [], DRY_DAY, "balanced", NOW);

    expect(evaluation.factorSummary.hazards.length).toBeGreaterThan(0);
    const mentionsHazard = evaluation.reasons.some((r) => /report/i.test(r));
    expect(mentionsHazard).toBe(true);
  });

  it("explains night-time unknown lighting without calling the road safe", () => {
    const route = straightRoute("r", [16.5, 80.64], [16.51, 80.66]);
    const evaluation = evaluateRoute(route, [], [], NIGHT_DRY, "balanced", NOW);
    const text = evaluation.reasons.join(" ");
    expect(text).toMatch(/lighting/i);
    expect(text).toMatch(/unknown/i);
  });

  it("weights waterlogging higher when it is raining", () => {
    const route = straightRoute("r", [16.5, 80.64], [16.51, 80.66]);
    const flooding = makeHazard({
      type: "waterlogging",
      severity: "high",
      lat: 16.505,
      lng: 80.65,
      confirmations: 1
    });
    const dry = evaluateRoute(route, [flooding], [], DRY_DAY, "balanced", NOW);
    const wet = evaluateRoute(route, [flooding], [], DAY_RAIN, "balanced", NOW);
    expect(wet.riskIndex).toBeGreaterThanOrEqual(dry.riskIndex);
    expect(wet.reasons.join(" ")).toMatch(/rain/i);
  });
});

describe("data confidence labels", () => {
  it("reports limited information when there are no reports and no map data", () => {
    expect(confidenceLabel([], 0, "unknown")).toBe("limited");
  });

  it("reports medium when there is coverage but no active reports", () => {
    expect(confidenceLabel([], 0, "available")).toBe("medium");
  });

  it("reports high only for recent confirmed reports", () => {
    expect(
      confidenceLabel(
        [
          {
            hazardId: "h",
            type: "accident",
            severity: "high",
            distanceM: 5,
            contribution: 0.9,
            freshness: 0.9,
            confidence: 0.9,
            ageHours: 0.2
          }
        ],
        0.5,
        "available"
      )
    ).toBe("high");
  });
});

describe("reasons builder", () => {
  it("says coverage is thin when there is no data at all", () => {
    const reasons = buildReasons({
      segments: [],
      hazardFactors: [],
      exposure: 0,
      conditions: DRY_DAY,
      lightingCoverage: "unknown"
    });
    expect(reasons.join(" ")).toMatch(/thin/i);
  });
});

describe("seed demo data", () => {
  it("produces a clearly-labelled demo dataset for the pilot zone", () => {
    const seed = seedHazards(NOW);
    expect(seed.length).toBeGreaterThanOrEqual(6);
    expect(seed.every((h) => h.isDemoData)).toBe(true);
    expect(seed.every((h) => h.status === "active")).toBe(true);
    const lighting = seed.find((h) => h.type === "poor_lighting")!;
    expect(lighting.expiresAt).toBeNull();
    const flooding = seed.find((h) => h.type === "waterlogging")!;
    expect(flooding.expiresAt).not.toBeNull();
  });
});