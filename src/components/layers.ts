import L from "leaflet";
import type { RankedRoute } from "../services/scoring";
import { formatDuration } from "./RouteList";
import { TIER_LABELS } from "../services/scoring";
import type { Hazard } from "../types";
import { activeHazards } from "../services/scoring";
const TIER_COLORS = {
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444"
} as const;

function latlngs(route: RankedRoute): L.LatLng[] {
  return route.route.geometry.map(([lat, lng]) => L.latLng(lat, lng));
}

export function drawRouteLayers(
  _map: L.Map,
  routes: RankedRoute[],
  selectedId: string | null,
  onPick: (id: string) => void
): L.LayerGroup {
  const group = L.layerGroup();
  const sortedRoutes = [...routes].sort((a, b) => {
    if (a.route.id === selectedId) return 1;
    if (b.route.id === selectedId) return -1;
    return 0;
  });
  for (const route of sortedRoutes) {
    const selected = route.route.id === selectedId;
    const path = latlngs(route);

          // casing so parallel routes stay readable
      L.polyline(path, {
        color: selected ? "#0f172a" : "#475569",
        weight: selected ? 10 : 8,
        opacity: selected ? 0.6 : 0.8,
        interactive: !selected
      }).on("click", () => {
        if (!selected) onPick(route.route.id);
      }).addTo(group);
  
      if (selected) {
        // per-segment colour banding only for selected route
        for (const seg of route.segments) {
          const pts = seg.points.map(([lat, lng]) => L.latLng(lat, lng));
          L.polyline(pts, {
            color: TIER_COLORS[seg.tier],
            weight: 6,
            opacity: 1.0,
            interactive: false
          }).addTo(group);
        }
      }L.polyline(path, {
      color: "#ffffff",
      weight: 1,
      opacity: 0.25,
      dashArray: "2 6"
    }).addTo(group);

    // interaction: a thin invisible route hit-area
    const hit = L.polyline(path, {
      color: "transparent",
      weight: 18,
      interactive: true,
      opacity: 0
    });
    hit.on("click", () => onPick(route.route.id));
    hit.bindTooltip(`${formatDuration(route.route.durationMin)} | risk ${route.riskIndex}/100 | ${route.confidence.replace("-", " ")} confidence`, { opacity: 0.9 });
    hit.addTo(group);

    // rank badge at route midpoint
    const mid = path[Math.floor(path.length / 2)];
    L.marker(mid, {
      icon: L.divIcon({
        className: "route-rank-badge",
        html: `<span>${route.rank}</span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      }),
      interactive: false
    }).addTo(group);
  }
  return group;
}

export function drawHazardMarkers(
  map: L.Map,
  hazards: Hazard[],
  now: number,
  raining: boolean,
  opts: {
    onVote: (id: string, vote: "yes" | "no") => void;
    onFocus: (hazard: Hazard) => void;
  }
): L.LayerGroup {
  const group = L.layerGroup();
  const actives = activeHazards(hazards, now, raining);
  console.log("drawHazardMarkers drawing actives:", actives);
  const zoom = map.getZoom();

  if (zoom <= 12) {
    // coarse grid clustering at low zoom
    const cells = new Map<string, Hazard[]>();
    for (const h of actives) {
      const key = `${Math.floor(h.lat * 90) / 90},${Math.floor(h.lng * 90) / 90}`;
      cells.set(key, [...(cells.get(key) ?? []), h]);
    }
    for (const [, cell] of cells) {
      const cLat = cell.reduce((a, h) => a + h.lat, 0) / cell.length;
      const cLng = cell.reduce((a, h) => a + h.lng, 0) / cell.length;
      const worst = Math.max(...cell.map((h) => severityRank(h.severity)));
      L.marker([cLat, cLng], {
        icon: L.divIcon({
          className: "hazard-cluster",
          html: `<span style="--wr:${worst}">${cell.length}</span>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        })
      })
        .addTo(group)
        .on("click", () => map.setView([cLat, cLng], Math.min(zoom + 2, 16)));
    }
    return group;
  }

  for (const h of actives) {
    const icon = L.divIcon({
      className: "hazard-marker",
      html: hazardMarkerHtml(h),
      iconSize: [34, 40],
      iconAnchor: [17, 38]
    });
    const marker = L.marker([h.lat, h.lng], { icon })
      .addTo(group)
      .bindPopup(hazardPopupHtml(h, now), { maxWidth: 260 });

    marker.on("click", () => opts.onFocus(h));
    marker.on("popupopen", () => {
      const el = document.querySelector(`[data-hazard-popup="${h.id}"]`);
      if (!el) return;
      const yes = el.querySelector<HTMLButtonElement>("[data-vote=yes]");
      const no = el.querySelector<HTMLButtonElement>("[data-vote=no]");
      const close = el.querySelector<HTMLButtonElement>("[data-close]");
      yes?.addEventListener("click", () => opts.onVote(h.id, "yes"));
      no?.addEventListener("click", () => opts.onVote(h.id, "no"));
      close?.addEventListener("click", () => marker.closePopup());
    });
  }
  return group;
}

function severityRank(s: string) {
  return s === "high" ? 3 : s === "medium" ? 2 : 1;
}

function hazardMarkerHtml(h: Hazard): string {
  return (
    `<span class="hm-${h.severity}">${h.type === "poor_lighting" ? "\u{1F4A1}" : h.type === "waterlogging" ? "\u{1F30A}" : h.type === "accident" ? "\u{1F4A5}" : h.type === "temporary_obstruction" ? "\u{1F6A7}" : h.type === "road_damage" ? "\u{1F573}\uFE0F" : "\u{1F3DC}\uFE0F"}<i class="badge">${h.confirmations}</i></span>`
  );
}
function hazardPopupHtml(h: Hazard, now: number): string {
  const ageH = (now - h.createdAt) / 3600_000;
  const age = ageH < 1 ? `${Math.max(1, Math.round(ageH * 60))}m` : ageH < 24 ? `${Math.round(ageH)}h` : `${Math.round(ageH / 24)}d`;
  return (
    `<div class="hazard-popup" data-hazard-popup="${h.id}">` +
    `<b>${h.type.replace(/_/g, " ")}</b> · severity ${h.severity}<br/>` +
    `<span class="muted">reported ${age} ago` +
    (h.isDemoData ? " · demo data" : "") +
    `</span><br/>` +
    (h.note ? `<span class="hazard-note">${escapeHtml(h.note)}</span><br/>` : "") +
    `<div class="vote-row">Still there? ` +
    `<button data-vote="yes">Yes</button><button data-vote="no">No</button>` +
    `</div><div class="vote-meta">${h.confirmations} confirm · ${h.denials} deny</div>` +
    `<button data-close class="popup-close">Close</button>` +
    `</div>`
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c] as string);
}

export { TIER_LABELS };
export function routeTierBadge(route: RankedRoute) {
  const counts = { green: 0, amber: 0, red: 0 };
  for (const s of route.segments) counts[s.tier] += 1;
  return counts;
}

export function fitRoutes(map: L.Map, routes: RankedRoute[]) {
  if (!routes.length) return;
  const bounds = L.latLngBounds([]);
  for (const r of routes) {
    for (const [lat, lng] of r.route.geometry) bounds.extend([lat, lng]);
  }
  map.fitBounds(bounds.pad(0.25));
}