import type { Conditions } from "../types";
import { isNight } from "../lib/sun";

const OPEN_METEO =
  "https://api.open-meteo.com/v1/forecast?current=precipitation,weather_code&timezone=auto";

export interface WeatherPoint {
  raining: boolean;
  precipitationMmh: number;
  weatherCode: number;
  fetchedAt: number;
}

let cache: WeatherPoint | null = null;
let cacheFor: [number, number] | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000;

export async function fetchWeather(
  lat: number,
  lng: number,
  now = Date.now()
): Promise<WeatherPoint | null> {
  if (
    cache &&
    cacheFor &&
    cache.fetchedAt + CACHE_TTL_MS > now
  ) {
    return cache;
  }
  try {
    const res = await fetch(`${OPEN_METEO}&latitude=${lat}&longitude=${lng}`, {
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return cache ?? null;
    const data = (await res.json()) as {
      current?: { precipitation?: number; weather_code?: number; time?: string };
    };
    const precipitationMmh = data.current?.precipitation ?? 0;
    const weatherCode = data.current?.weather_code ?? 0;
    const raining =
      precipitationMmh > 0.2 || [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(weatherCode);
    cache = { raining, precipitationMmh, weatherCode, fetchedAt: now };
    cacheFor = [lat, lng];
    return cache;
  } catch {
    return cache ?? null;
  }
}

/**
 * Assemble the context the scoring engine needs. Falls back gracefully when
 * the weather service is unreachable (prefers to say "no data / conservative"
 * over a wrong confident answer).
 */
export async function buildConditions(
  lat: number,
  lng: number,
  date = new Date()
): Promise<Conditions> {
  const w = await fetchWeather(lat, lng, date.getTime());
  return {
    night: isNight(lat, lng, date),
    raining: w?.raining ?? false,
    precipitationMmh: w?.precipitationMmh ?? 0,
    fetchedAt: date.getTime(),
    sourceWarning: w ? undefined : "Weather data unavailable; context assumed dry."
  };
}