# Safe-Route Navigator

A campus & city safe-route walk planner PWA. It ranks 2–3 walking routes by travel time **and** a transparent, rule-based risk estimate built from community hazard reports — so users can trade a few minutes for a safer, better-lit, drier route and see exactly *why*.

## Features

- **Live map** (Leaflet) with route overlays, hazards, and street-lighting context.
- **Risk-aware routing** – public OSRM for base geometry (optional OpenRouteService `avoid_polygons` when hazards are active).
- **Transparent scoring** – per-segment risk = `severity × confidence × freshness + context penalties − verified benefits`; green/amber/red bands, 0–100 route risk, and per-reason explanations shown on each route card.
- **Data confidence labels** – High / Medium / Low / **Limited information** (no data is never presented as "safe").
- **Community reporting** – long-press the map, add category/severity/note/photo; dedup within 25 m, rate limit, one-vote-per-user, moderation status.
- **Live context** – real day/night (solar calc), current rain (Open-Meteo), OSM street-lighting coverage (Overpass, cached; demo fallback).
- **Mode selection** – Fastest / Balanced / Lower-estimated-risk.
- **PWA** – installable, offline-capable.

## Quick start

```bash
npm install
npm run dev        # -> http://localhost:5173
```

No API keys are required: the app ships with seeded demo hazards around Benz Circle, Vijayawada and defaults to a local synchronized data provider (tab-to-tab via BroadcastChannel). Open two tabs to watch reports propagate live.

```bash
npm test           # 29 tests (scoring, expiry, dedup, ranking, explanations, night/solar)
npm run build      # production PWA -> dist/
npm run preview    # serve the production build
```

## Live backend (optional)

1. Create a Firebase project; enable Firestore, Anonymous Auth, and Storage.
2. Deploy `firestore.rules` and `firestore.indexes.json` to your project.
3. Copy `.env.example` → `.env` and fill in your Firebase web config.
4. Optional: add an OpenRouteService API key (`VITE_ORS_API_KEY`) to enable hazard-avoiding routes.

The app uses the real backend automatically when Firebase env vars are present, otherwise falls back to the local demo provider.

## Where the risk signal comes from

- **Hazard reports** (= the "is there risk here" input) — user-submitted, or seeded demo data (always labelled `demo`).
- **Static context** — street lamps / roads from OpenStreetMap (Overpass), with a seeded fallback.
- **Current weather** — Open-Meteo (real).
- **Day/night** — computed from solar position.

Risk is computed only for active hazards within 30 m of a route segment. "No reports" ≠ "safe" — that state is shown as *Limited information*.

> Note: demo hazards are fictional; they exist to showcase the scoring engine.

## Project layout

```
src/
  services/scoring.ts      rule-based risk engine (rules versioned)
  services/routing.ts      OSRM + ORS adapters
  services/dataProvider.ts provider switch (Firestore | local demo)
  services/firestoreProvider.ts  live Firestore implementation
  services/mockProvider.ts local provider with seeded demo data
  services/context.ts      Overpass static context + demo lamps
  services/weather.ts      Open-Meteo
  services/geocoder.ts     Nominatim + campus landmarks
  lib/                     geo, geohash, solar, id helpers
  hooks/                   useHazards, useRoutes, useGeolocation
  components/              MapView, RouteList, ReportFlow, ...
  config/                  pilot config, hazard rules, demo seed
```

## Limitations / honesty

- Hazard coverage depends on community participation; sparse data is shown as *Limited information*, never as "safe".
- Public OSRM/Nominatim are free-tier and rate-limited; fine for a demo, not for production traffic.
- Live-backend collection names match this repo's `firestore.rules` / `firestore.indexes.json`.