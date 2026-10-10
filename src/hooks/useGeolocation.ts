import { useCallback, useEffect, useState } from "react";

export interface GeoState {
  status: "idle" | "prompt" | "granted" | "denied" | "unavailable" | "error";
  position: [number, number] | null;
  accuracyM: number | null;
  error: string | null;
}

/**
 * GPS is only requested when the user asks for it (privacy control #7.6).
 * No continuous trail is kept: we request a single high-accuracy fix.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    status: "idle",
    position: null,
    accuracyM: null,
    error: null
  });

  const request = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState({ status: "unavailable", position: null, accuracyM: null, error: "Geolocation unavailable" });
      return;
    }
    setState((s) => ({ ...s, status: "prompt", error: null }));
    navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          status: "granted",
          position: [pos.coords.latitude, pos.coords.longitude],
          accuracyM: pos.coords.accuracy,
          error: null
        });
      },
      (err) => {
        setState({
          status: err.code === err.PERMISSION_DENIED ? "denied" : "error",
          position: null,
          accuracyM: null,
          error: err.message
        });
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 5000 }
    );
  }, []);

  return { ...state, request };
}

/** One-shot clock for keeping "reported X ago" labels fresh. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}