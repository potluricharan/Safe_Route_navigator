import { useEffect, useState } from "react";
import type { DataProvider, Hazard } from "../types";
import { activeHazards } from "../services/scoring";

/** Subscribe to the provider's live hazard feed, plus a minute tick for expiry. */
export function useHazards(provider: DataProvider | null, raining: boolean) {
  const [allHazards, setAllHazards] = useState<Hazard[]>([]);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!provider) return;
    let unsub: (() => void) | undefined;
    setReady(false);
    provider.initialize().then(() => {
      if (!provider) return;
      unsub = provider.onHazardsChanged((hazards) => {
        setAllHazards(hazards);
        setReady(true);
      });
    });
    return () => {
      unsub?.();
      setReady(false);
    };
  }, [provider]);

  // Advance the clock once a minute so stale hazards drop out of scoring and
  // the hazard layer ages naturally without redrawing on every state change.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const active = activeHazards(allHazards, now, raining);

  return { allHazards, active, ready, now };
}

export function useConditions(lat: number, lng: number) {
  const [conditions, setConditions] = useState<{
    night: boolean;
    raining: boolean;
    precipitationMmh: number;
    fetchedAt: number;
    sourceWarning?: string;
  }>({ night: false, raining: false, precipitationMmh: 0, fetchedAt: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { buildConditions } = await import("../services/weather");
      const c = await buildConditions(lat, lng);
      if (!cancelled) {
        setConditions(c);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  return { conditions, loading };
}