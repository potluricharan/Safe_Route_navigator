import { Hazard } from "./src/types";

function hazardMarkerHtml(h: any): string {
  return (
    `<span class="hm-${h.severity}">${h.type === "poor_lighting" ? "\u{1F4A1}" : h.type === "waterlogging" ? "\u{1F30A}" : h.type === "accident" ? "\u{1F4A5}" : h.type === "temporary_obstruction" ? "\u{1F6A7}" : h.type === "road_damage" ? "\u{1F573}\uFE0F" : "\u{1F3DC}\uFE0F"}<i class="badge">${h.confirmations}</i></span>`
  );
}

console.log(hazardMarkerHtml({ type: "road_damage", severity: "high", confirmations: 0 }));
