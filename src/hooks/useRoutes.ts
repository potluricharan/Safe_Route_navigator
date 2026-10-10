import { useEffect, useState } from "react";
import type {
  Conditions,
  Hazard,
  RouteCandidate,
  RouteMode,
  StaticFeature
} from "../types";
import { evaluateRoute, rankRoutes, type RankedRoute } from "../services/scoring";
import { fetchAvoidHazardsRoute, fetchOSRMRoutes } from "../services/routing";
import { demoStaticFeatures, fetchStaticFeatures } from "../services/context";
import { bboxOfPoints, bboxContains } from "../lib/geo";

type LatLng = [number, number];

const GEOMETRY_TTL_MS = 5 * 60 * 1000;
const geometryCache = new Map<string, { at: number; routes: RouteCandidate[] }>();

/** Static context (street lamps etc) around the current hazard set. */
export function useStaticContext(hazards: Hazard[]) {
  const [features, setFeatures] = useState<StaticFeature[]>([]);
  const [source, setSource] = useState<"osm" | "demo" | "none">("none");

  useEffect(() => {
    if (hazards.length === 0) return;
    const pts = hazards.map((h) => [h.lat, h.lng] as LatLng);
    const bbox = bboxOfPoints(pts);
    const margin = 0.01;
    const padded = {
      minLat: bbox.minLat - margin,
      minLng: bbox.minLng - margin,
      maxLat: bbox.maxLat + margin,
      maxLng: bbox.maxLng + margin
    };
    let cancelled = false;
    (async () => {
      const osm = await fetchStaticFeatures(padded);
      if (cancelled) return;
      const combined = mergeFeatures(osm, demoStaticFeatures());
      setFeatures(combined);
      setSource(osm.length > 0 ? "osm" : "demo");
    })();
    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(hazards.map((h) => h.id))]); // eslint-disable-line react-hooks/exhaustive-deps

  return { features, source, covered: features.some((f) => f.kind === "street_lamp") };
}

function mergeFeatures(a: StaticFeature[], b: StaticFeature[]) {
  const seen = new Set<string>();
  return [...a, ...b].filter((f) => {
    const key = `${f.kind}:${f.lat.toFixed(4)}:${f.lng.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** BBox filter is applied by the components; unused hooks param kept tidy. */
export function filterHazardsToRoutes(
  hazards: Hazard[],
  routes: RouteCandidate[]
): Set<string> {
  const relevant = new Set<string>();
  for (const r of routes) {
    const bbox = bboxOfPoints(r.geometry);
    for (const h of hazards) {
      if (bboxContains(bbox, [h.lat, h.lng])) relevant.add(h.id);
    }
  }
  return relevant;
}

export function useRouteFetch(
  start: LatLng | null,
  destination: LatLng | null,
  hazards: Hazard[],
  features: StaticFeature[],
  conditions: Conditions,
  mode: RouteMode
) {
  const [routes, setRoutes] = useState<RankedRoute[] | null>(null);
  const [allCandidates, setAllCandidates] = useState<RouteCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!start || !destination) {
      setRoutes(null);
      setAllCandidates([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const controller = new AbortController();

    (async () => {
      const hazardHash = hazards.filter(h => h.severity === "high").map(h => h.id).join(",");
        const key = `${start[0].toFixed(5)},${start[1].toFixed(5)}>${destination[0].toFixed(5)},${destination[1].toFixed(5)}|${hazardHash}`;
      try {
        let candidates: RouteCandidate[] | null = null;
        const cached = geometryCache.get(key);
        if (cached && Date.now() - cached.at < GEOMETRY_TTL_MS) {
          candidates = cached.routes;
        }
        if (!candidates) {
          const [osrm, ors] = await Promise.all([
            fetchOSRMRoutes(start, destination, { alternatives: 2, signal: controller.signal }),
            fetchAvoidHazardsRoute(start, destination, hazards, Date.now(), conditions.raining, controller.signal).catch(() => [])
          ]);
          candidates = osrm.concat(ors);
          geometryCache.set(key, { at: Date.now(), routes: candidates });
        }
        if (cancelled || controller.signal.aborted) return;

        const now = Date.now();
        // Throttle: scoring recomputes from live hazards on every change; the
        // geometry fetch is the expensive bit and that is the cached part.
        const evals = candidates.map((r) =>
          evaluateRoute(
            r,
            hazards,
            features,
            conditions,
            mode,
            now
          )
        );
        const ranked = rankRoutes(evals, mode);
        if (!cancelled) {
          setAllCandidates(candidates);
          setRoutes(ranked);
        }
      } catch (e) {
        if (!cancelled && !controller.signal.aborted) {
          setError(String(e));
          setRoutes(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    start?.[0],
    start?.[1],
    destination?.[0],
    destination?.[1],
    mode,
    JSON.stringify(hazards.map((h) => `${h.id}:${h.confirmations}:${h.denials}:${h.updatedAt}`)),
    JSON.stringify(features.map((f) => f.id)),
    conditions.night,
    conditions.raining
  ]);

  return { routes, allCandidates, loading, error };
}