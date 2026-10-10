/**
 * Sunrise/sunset via the standard "sunrise equation" (NOAA-style), from a
 * published, testable algorithm. Pure functions only.
 */

export interface SunTimes {
  isNight: boolean;
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
}

const DEG = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const mod = (x: number, m: number) => ((x % m) + m) % m;

const jdFromUnix = (ms: number) => ms / 86400000 + 2440587.5;
const unixFromJd = (jd: number) => (jd - 2440587.5) * 86400000;

export function sunTimesFor(
  lat: number,
  lng: number,
  date: Date
): SunTimes | null {
  const midnightUtc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
  const JD = jdFromUnix(midnightUtc);
  // Shift to the ~mid-day of the UTC date (Julian days are noon-based) so the
  // transit lands on the correct calendar day.
  const n = JD + 0.5 - 2451545.0 + 0.0008;
  const Jstar = n - lng / 360;

  const M = mod(357.5291 + 0.98560028 * Jstar, 360);
  const C = 1.9148 * Math.sin(M * DEG) + 0.02 * Math.sin(2 * M * DEG) + 0.0003 * Math.sin(3 * M * DEG);
  const lambda = mod(M + C + 180 + 102.9372, 360);

  const Jtransit = 2451545.0 + Jstar + 0.0053 * Math.sin(M * DEG) - 0.0069 * Math.sin(2 * lambda * DEG);

  const sinDelta = Math.sin(lambda * DEG) * Math.sin(23.4397 * DEG);
  const delta = Math.asin(sinDelta) * RAD2DEG;

  const phi = lat * DEG;
  const cosOmega =
    (Math.sin((-0.833) * DEG) - Math.sin(phi) * Math.sin(delta * DEG)) /
    (Math.cos(phi) * Math.cos(delta * DEG));

  if (cosOmega < -1 || cosOmega > 1) return null; // polar day/night

  const omega = Math.acos(Math.min(1, Math.max(-1, cosOmega))) * RAD2DEG;

  const Jrise = Jtransit - omega / 360;
  const Jset = Jtransit + omega / 360;

  const sunrise = new Date(unixFromJd(Jrise));
  const sunset = new Date(unixFromJd(Jset));
  const solarNoon = new Date(unixFromJd(Jtransit));

  return {
    isNight: date.getTime() < sunrise.getTime() || date.getTime() >= sunset.getTime(),
    sunrise,
    sunset,
    solarNoon
  };
}

export function isNight(lat: number, lng: number, date = new Date()): boolean {
  const times = sunTimesFor(lat, lng, date);
  if (!times) return true; // conservative when the model is out of range
  return times.isNight;
}