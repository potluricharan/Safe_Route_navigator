import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import type { Hazard, RouteMode } from "../types";
import type { RankedRoute } from "../services/scoring";
import {
  drawHazardMarkers,
  drawRouteLayers,
  fitRoutes
} from "./layers";

export type LatLngPair = [number, number];
export type PickMode = "start" | "destination" | null;

interface MapViewProps {
  start: LatLngPair | null;
  destination: LatLngPair | null;
  hazards: Hazard[];
  now: number;
  raining: boolean;
  routes: RankedRoute[] | null;
  selectedRouteId: string | null;
  mode: RouteMode;
  pickMode: PickMode;
  onSelectRoute: (id: string) => void;
  onPickPoint: (point: LatLngPair) => void;
  onReportAt: (point: LatLngPair) => void;
  onVote: (id: string, vote: "yes" | "no") => void;
  onHazardFocus: (hazard: Hazard) => void;
  mapCenter: LatLngPair; currentLocation?: [number, number] | null;
  showHeatmap?: boolean;
  showSafePlaces?: boolean; safePlacesList?: any[];
}

interface MarkerPlacement {
  point: LatLngPair;
  color: string;
  emoji: string;
  label?: string;
}

function pointMarker(p: MarkerPlacement, selected: boolean): L.Marker {
  return L.marker([p.point[0], p.point[1]], {
    icon: L.divIcon({
      className: "travel-point",
      html: `<span class="pt ${selected ? "pt-selected" : ""}" style="--ptc:${p.color}">${p.emoji}</span>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    })
  });
}

export default function MapView(props: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const hazardLayerRef = useRef<L.LayerGroup | null>(null);

  // build the map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [props.mapCenter[0], props.mapCenter[1]],
      zoom: 14,
      attributionControl: true,
      zoomControl: true
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    // Add Live Traffic Layer if TomTom Key is present
    const tomTomKey = import.meta.env.VITE_TOMTOM_KEY;
    if (tomTomKey) {
      L.tileLayer(`https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?tileSize=256&thickness=20&key=${tomTomKey}`, {
        maxZoom: 19,
        opacity: 1.0,
        attribution: '&copy; TomTom Traffic'
      }).addTo(map);
    }
    mapRef.current = map;
    setMapReady(true);
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // click to place start / destination when a pick mode is active
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onClick = (e: L.LeafletMouseEvent) => {
      if (props.pickMode) {
        props.onPickPoint([e.latlng.lat, e.latlng.lng]);
      }
    };
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.pickMode]);

  // long-press anywhere to report a hazard (also guards the privacy/workflow
  // reasons: reporting requires an explicit gesture, never an accidental one)
  useEffect(() => {
    const container = containerRef.current;
    const map = mapRef.current;
    if (!container || !map) return;
    let timer: number | null = null;
    let startPoint: { x: number; y: number } | null = null;
    let fired = false;

    const down = (e: PointerEvent) => {
      if (pointerOnButton(e)) return;
      fired = false;
      startPoint = { x: e.clientX, y: e.clientY };
      timer = window.setTimeout(() => {
        if (!startPoint) return;
        fired = true;
        const latlng = map.containerPointToLatLng(
          map.mouseEventToContainerPoint(e)
        );
        props.onReportAt([latlng.lat, latlng.lng]);
      }, 560);
    };
    const move = (e: PointerEvent) => {
      if (!startPoint) return;
      const dx = e.clientX - startPoint.x;
      const dy = e.clientY - startPoint.y;
      if (Math.hypot(dx, dy) > 10) clear();
    };
    const up = () => {
      if (timer !== null && !fired) clear();
    };
    const clear = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
      startPoint = null;
    };

    container.addEventListener("pointerdown", down);
    container.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      container.removeEventListener("pointerdown", down);
      container.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.pickMode]);

  // hazard markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !props.hazards) return;
    hazardLayerRef.current?.remove();
    const group = drawHazardMarkers(map, props.hazards, props.now, props.raining, {
      onVote: props.onVote,
      onFocus: props.onHazardFocus
    });
    group.addTo(map);
    hazardLayerRef.current = group;
    return () => {
      group.remove();
      hazardLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.hazards, props.now, props.raining]);

  // route layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !props.routes) {
      routeLayerRef.current?.remove();
      return;
    }
    routeLayerRef.current?.remove();
    const group = drawRouteLayers(map, props.routes, props.selectedRouteId, props.onSelectRoute);
    group.addTo(map);
    routeLayerRef.current = group;
    return () => {
      group.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.routes, props.selectedRouteId]);

  // start/destination markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const group = L.layerGroup().addTo(map);
      if (props.start)
        pointMarker({ point: props.start, color: "#22c55e", emoji: "🟢", label: "Start" }, true).addTo(group);
      if (props.destination)
        pointMarker({ point: props.destination, color: "#ef4444", emoji: "🏁", label: "End" }, true).addTo(group);
      if (props.currentLocation) {
        L.marker(props.currentLocation, {
           icon: L.divIcon({
              className: "current-location-dot",
              html: '<div style="background:#3b82f6; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);"></div>',
              iconSize: [22, 22],
              iconAnchor: [11, 11]
           })
        }).addTo(group);
      }
    return () => {
      group.remove();
    };
    }, [props.start, props.destination, props.currentLocation]);

  // fit the camera to a new route set (and only then)
  const fittedKeyRef = useRef("");
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !props.routes?.length) return;
    const key = [
      props.start?.join(",") ?? "",
      props.destination?.join(",") ?? "",
      props.routes.map((r) => r.route.id).join(",")
    ].join("|");
    if (fittedKeyRef.current !== key) {
      fittedKeyRef.current = key;
      fitRoutes(map, props.routes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.start, props.destination, props.routes]);

  // Heatmap and Safe Places
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    const layerGroup = L.layerGroup().addTo(map);

    // Heatmap (Native Circles)
    if (props.showHeatmap && props.hazards) {
      props.hazards.forEach(h => {
        L.circle([h.lat, h.lng], { radius: 150, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.4, stroke: false }).addTo(layerGroup);
        L.circle([h.lat, h.lng], { radius: 50, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.8, stroke: false }).addTo(layerGroup);
      });
    }

    // Safe Places
    if (props.showSafePlaces && props.safePlacesList) {
      let activeRouteGeometry: [number, number][] = [];
      if (props.routes && props.routes.length > 0) {
         const activeRoute = props.routes.find(r => r.route.id === props.selectedRouteId) || props.routes[0];
         if (activeRoute) activeRouteGeometry = activeRoute.route.geometry;
      }

      props.safePlacesList.forEach((poi: any) => {
         const lat = poi.lat ?? poi.center?.lat;
         const lon = poi.lon ?? poi.center?.lon;
         
         if (activeRouteGeometry.length > 0) {
             let minRouteDist = Infinity;
             for (const pt of activeRouteGeometry) {
                 const d = Math.sqrt(Math.pow(lat - pt[0], 2) + Math.pow(lon - pt[1], 2));
                 if (d < minRouteDist) minRouteDist = d;
                 if (minRouteDist * 111320 < 400) break;
             }
             if (minRouteDist * 111320 > 400) return;
         }

         const origin = props.start || props.mapCenter;
         const d = Math.sqrt(Math.pow(lat - origin[0], 2) + Math.pow(lon - origin[1], 2));
         const distM = Math.round(d * 111320);
         
         let typeStr = "Safe Zone";
         if (poi.tags?.amenity === "police") typeStr = "Police Station";
         else if (poi.tags?.amenity === "hospital") typeStr = "Hospital";
         else if (poi.tags?.amenity === "university") typeStr = "Campus Security";
         else if (poi.tags?.tourism === "hostel" || poi.tags?.accommodation === "hostel") typeStr = "Women's Hostel";
         else if (poi.tags?.shop) typeStr = "24/7 Safe Shop";

         const name = poi.tags?.name || typeStr;
         const phone = poi.tags?.phone || poi.tags?.['contact:phone'] || '100';
         
         const icon = L.divIcon({
            className: "custom-safe-poi",
            html: `<div style="background:#3b82f6;border-radius:50%;padding:4px;border:2px solid white;box-shadow:0 0 10px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:12px;">🛡️</span></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
         });
         L.marker([lat, lon], { icon }).bindPopup(`<div style="text-align:center;min-width:120px;"><b style="font-size:14px;color:#0f172a;">${name}</b><br/><span style="color:#10b981;font-weight:bold;">${distM}m away</span><br/><a href="tel:${phone}" style="text-decoration:none;"><div style="margin-top:6px;background:#ef4444;color:white;padding:4px 8px;border-radius:4px;font-weight:bold;display:inline-block;">📞 ${phone}</div></a></div>`).addTo(layerGroup);
      });
    }

    return () => {
      layerGroup.remove();
    };
  }, [props.showHeatmap, props.showSafePlaces, props.hazards]);

  if (!mapReady) {
    return <div className="map" ref={containerRef} />;
  }
  return (
    <div className="map" ref={containerRef}>
      {props.pickMode && (
        <div className="pick-banner">
          Tap the map to set {props.pickMode === "start" ? "start" : "destination"}. Long-press anywhere to report a hazard.
        </div>
      )}
    </div>
  );
}

function pointerOnButton(e: PointerEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t?.closest("button, a, .leaflet-control, .route-rank-badge");
}


