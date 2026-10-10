import { useMemo, useRef, useState, useEffect } from "react";
import MapView, { type LatLngPair, type PickMode } from "./components/MapView";
import SearchBar, { type WhichPoint } from "./components/SearchBar";
import ModeSelector, { ModeDescription } from "./components/ModeSelector";
import RouteList, { formatDuration } from "./components/RouteList";
import ReportFlow from "./components/ReportFlow";
import StatusBar from "./components/StatusBar";
import { Legend, InfoSheet } from "./components/Legend";
import ConfidenceBadge, { confidenceHint } from "./components/ConfidenceBadge";
import { createDataProvider } from "./services/dataProvider";
import { useConditions, useHazards } from "./hooks/useHazards";
import { useRouteFetch, useStaticContext } from "./hooks/useRoutes";
import { useGeolocation } from "./hooks/useGeolocation";
import { newId } from "./lib/id";
import { CAMPUS, HAZARD_TYPE_RULES } from "./config/app";
import type { Hazard, RouteMode } from "./types";
import { formatAge } from "./services/scoring";

type Panel = "routes" | "info";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoggedIn(true), 2500);
    return () => clearTimeout(timer);
  }, []);
  const providerRef = useRef(createDataProvider());
  const provider = providerRef.current;
  const reporterId = useMemo(
    () => localStorage.getItem("srn_uid") ?? newId("u"),
    []
  );
  if (!localStorage.getItem("srn_uid")) {
    localStorage.setItem("srn_uid", reporterId);
  }

  // default demo journey: Benz Circle -> PNBS bus stand, so hazards matter.
  const [start, setStart] = useState<LatLngPair | null>(null);
  const [destination, setDestination] = useState<LatLngPair | null>(null);
  const [startLabel, setStartLabel] = useState("");
  const [destLabel, setDestLabel] = useState("");
  const [mode, setMode] = useState<RouteMode>("balanced");
  const [pickMode, setPickMode] = useState<PickMode>(null);
  const [transportMode, setTransportMode] = useState<"driving" | "foot" | "bike">("driving");
  const [reportPoint, setReportPoint] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [panel, setPanel] = useState<Panel>("routes");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const geo = useGeolocation();
  const contextPoint: LatLngPair = geo.position ?? [
    CAMPUS.center[0],
    CAMPUS.center[1]
  ];

  const { conditions: baseConditions } = useConditions(contextPoint[0], contextPoint[1]);
  const [demoNight, setDemoNight] = useState<boolean | null>(null);
  const [demoRain, setDemoRain] = useState<boolean | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showSafePlaces, setShowSafePlaces] = useState(false);
  const [sosPlace, setSosPlace] = useState<any | null>(null);
  const [safePlacesList, setSafePlacesList] = useState<any[]>([
    { lat: 16.505, lon: 80.620, tags: { name: "Vijayawada General Hospital", amenity: "hospital" } },
    { lat: 16.512, lon: 80.615, tags: { name: "City Police Station", amenity: "police" } },
    { lat: 16.495, lon: 80.635, tags: { name: "24/7 Supermart", shop: "convenience", opening_hours: "24/7" } },
    { lat: 16.500, lon: 80.645, tags: { name: "Women's Hostel A", tourism: "hostel" } },
    { lat: 16.520, lon: 80.630, tags: { name: "Campus Security Main Gate", amenity: "university" } },
    { lat: 16.305, lon: 80.440, tags: { name: "Guntur General Hospital", amenity: "hospital" } },
    { lat: 16.310, lon: 80.445, tags: { name: "Guntur East Police Station", amenity: "police" } },
  ]);

  useEffect(() => {
    const query = `[out:json][timeout:25];(nwr["amenity"="police"](16.40,80.50,16.60,80.70);nwr["amenity"="hospital"](16.40,80.50,16.60,80.70);nwr["shop"]["opening_hours"~"24/7"](16.40,80.50,16.60,80.70);nwr["tourism"="hostel"](16.40,80.50,16.60,80.70);nwr["amenity"="university"](16.40,80.50,16.60,80.70););out center;`;
    fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: query })
      .then(res => res.json())
      .then(data => setSafePlacesList(data.elements || []))
      .catch(() => {});
  }, []);

  const handleNearestSafePlace = () => {
    if (safePlacesList.length === 0) {
       alert("Still loading safe places from map data...");
       return;
    }
    const origin = start || contextPoint;
    let closest = safePlacesList[0];
    let minDist = Infinity;
    safePlacesList.forEach(p => {
       const d = Math.sqrt(Math.pow((p.lat ?? p.center?.lat) - origin[0], 2) + Math.pow((p.lon ?? p.center?.lon) - origin[1], 2));
       if (d < minDist) { minDist = d; closest = p; }
    });
    
    const distMeters = Math.round(minDist * 111320);
    let typeStr = "Safe Zone";
    if (closest.tags?.amenity === "police") typeStr = "Police Station";
    else if (closest.tags?.amenity === "hospital") typeStr = "Hospital";
    else if (closest.tags?.amenity === "university") typeStr = "Campus Security Post";
    else if (closest.tags?.tourism === "hostel" || closest.tags?.accommodation === "hostel") typeStr = "Women's Hostel";
    else if (closest.tags?.shop) typeStr = "24/7 Safe Shop";
    const name = closest.tags?.name || "Safe Zone";
    
    setSosPlace({ place: closest, distMeters, typeStr, name });
  };

  const conditions = {
    ...baseConditions,
    night: demoNight !== null ? demoNight : baseConditions.night,
    raining: demoRain !== null ? demoRain : baseConditions.raining,
  };

  const hazards = useHazards(provider, conditions.raining);
  const baseActive: Hazard[] = hazards.active;
  const { features, source: ctxSource } = useStaticContext(baseActive);

    const [demoHazards, setDemoHazards] = useState<any[]>([]);
  const active = useMemo(() => {
     if (demoHazards.length > 0) return [...baseActive, ...demoHazards];
     return baseActive;
  }, [baseActive, demoHazards]);

  const prevActiveRef = useRef<number>(0);
  useEffect(() => {
     if (prevActiveRef.current > 0 && active.length > prevActiveRef.current) {
        setToast("New hazard reported! Route scores updated. 🚨");
        window.setTimeout(() => setToast(null), 4000);
     }
     prevActiveRef.current = active.length;
  }, [active.length]);

  const { routes, loading, error } = useRouteFetch(
    start,
    destination,
    active,
    features,
    conditions,
    mode
  );

      useEffect(() => {
    if (routes && routes.length > 0 && demoHazards.length === 0 && !baseActive.some(h => h.isDemoData)) {
      const sorted = [...routes].sort((a,b) => a.route.durationMin - b.route.durationMin);
      const r1 = sorted[0]?.route;
      const r2 = sorted[1]?.route;
      
      const newHazards: any[] = [];
      
      if (r1) {
        const mid = r1.geometry[Math.floor(r1.geometry.length / 2)];
        newHazards.push({
          id: "demo-hazard-1", type: "waterlogging", severity: "high",
          lat: mid[0], lng: mid[1], createdAt: Date.now() - 3600000, updatedAt: Date.now(), expiresAt: Date.now() + 86400000,
          confirmations: 5, denials: 0, status: "active", reporterId: "demo", isDemoData: true, note: "Major waterlogging"
        });
        
        newHazards.push({
          id: "demo-hazard-3", type: "isolated", severity: "low",
          lat: mid[0] + 0.015, lng: mid[1] + 0.005, createdAt: Date.now() - 7200000, updatedAt: Date.now(), expiresAt: Date.now() + 86400000,
          confirmations: 1, denials: 0, status: "active", reporterId: "demo", isDemoData: true, note: "Isolated stretch"
        });
        
        newHazards.push({
          id: "demo-hazard-4", type: "lighting", severity: "medium",
          lat: mid[0] - 0.01, lng: mid[1] - 0.02, createdAt: Date.now() - 1800000, updatedAt: Date.now(), expiresAt: Date.now() + 86400000,
          confirmations: 2, denials: 0, status: "active", reporterId: "demo", isDemoData: true, note: "No street lights"
        });
      }
      
      if (r2) {
        const mid2 = r2.geometry[Math.floor(r2.geometry.length / 3)];
        newHazards.push({
          id: "demo-hazard-2", type: "accident", severity: "medium",
          lat: mid2[0], lng: mid2[1], createdAt: Date.now() - 1800000, updatedAt: Date.now(), expiresAt: Date.now() + 86400000,
          confirmations: 1, denials: 1, status: "active", reporterId: "demo", isDemoData: true, note: "Unverified accident report"
        });
      }

            // Add 30 random hazards across Vijayawada and Guntur
      const types = ["waterlogging", "accident", "lighting", "isolated", "damage"];
      const severities = ["low", "medium", "high"];
      const descriptions: Record<string, string[]> = {
          "waterlogging": ["Knee-deep water after rain", "Blocked drain causing flood", "Slight water pooling", "Heavy waterlogging under bridge"],
          "accident": ["Frequent accident spot", "Blind curve collision", "Minor fender bender", "Intersection crash zone"],
          "lighting": ["Completely dark stretch", "Flickering streetlights", "No streetlights working", "Pitch black alleyway"],
          "isolated": ["Deserted road after 9PM", "No shops or houses around", "Known unsafe stretch", "Very lonely road"],
          "damage": ["Massive pothole", "Road dug up for pipeline", "Broken pavement", "Severe road damage"]
      };

      for (let i = 0; i < 30; i++) {
         const rand = Math.random();
         let lat, lng;
         if (rand < 0.6) {
            lat = 16.48 + Math.random() * 0.07;
            lng = 80.60 + Math.random() * 0.08;
         } else if (rand < 0.8) {
            lat = 16.28 + Math.random() * 0.07;
            lng = 80.40 + Math.random() * 0.08;
         } else {
            lat = 16.35 + Math.random() * 0.13;
            lng = 80.48 + Math.random() * 0.12;
         }
         const t = types[Math.floor(Math.random() * types.length)];
         const descs = descriptions[t];
         const note = descs[Math.floor(Math.random() * descs.length)];
         
         newHazards.push({
            id: "demo-rand-" + i,
            type: t,
            severity: severities[Math.floor(Math.random() * severities.length)],
            lat, lng,
            createdAt: Date.now() - Math.random() * 86400000,
            updatedAt: Date.now(),
            expiresAt: Date.now() + 86400000,
            confirmations: Math.floor(Math.random() * 10),
            denials: Math.floor(Math.random() * 3),
            status: "active", reporterId: "demo-random", isDemoData: true, note
         });
      }
      
      setDemoHazards(newHazards);
    }
  }, [routes, demoHazards, baseActive]);

  const selection: string | null =
    selectedRouteId && routes?.some((r) => r.route.id === selectedRouteId)
      ? selectedRouteId
      : (routes?.[0]?.route.id ?? null);

  const [focusedHazard, setFocusedHazard] = useState<Hazard | null>(null);

  const setPoint = (which: WhichPoint, p: LatLngPair, label?: string) => {
    if (which === "start") {
      setStart(p);
      setStartLabel(label ? label.split(",")[0] : "Selected on Map");
    } else {
      setDestination(p);
      setDestLabel(label ? label.split(",")[0] : "Selected on Map");
    }
    setPickMode(null);
  };

  // Autonomous TomTom Live Incident Ingestion
  useEffect(() => {
    if (!provider || !hazards.ready) return;
    const tomTomKey = import.meta.env.VITE_TOMTOM_KEY;
    if (!tomTomKey) return;

    const fetchLiveTraffic = async () => {
      try {
        const bbox = "80.5,16.4,80.7,16.6";
        const url = `https://api.tomtom.com/traffic/services/5/incidentDetails?key=${tomTomKey}&bbox=${bbox}&fields={incidents{geometry{type,coordinates},properties{iconCategory}}}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.incidents && Array.isArray(data.incidents)) {
          data.incidents.forEach((inc: any, i: number) => {
            const coords = inc.geometry?.coordinates;
            if (!coords || coords.length === 0) return;
            
            // Get center coordinate of the jam
            const mid = coords[Math.floor(coords.length / 2)];
            const lon = mid[0];
            const lat = mid[1];
            
            const cat = inc.properties?.iconCategory;
            let type: any = "temporary_obstruction";
            if (cat === 1) type = "accident";
            if (cat === 11) type = "waterlogging";
            if (cat === 9) type = "road_damage";

            const hazardId = `tomtom-live-${i}`;
            const exists = hazards.active.some(h => h.note === hazardId);
            
            if (!exists) {
              provider.addHazard({
                type,
                severity: "high",
                lat,
                lng,
                note: hazardId,
                reporterId: "tomtom-live-system"
              });
            }
          });
        }
      } catch (e) {
        console.error("Failed to fetch live traffic", e);
      }
    };

    // Fetch immediately, then every 60 seconds
    fetchLiveTraffic();
    const interval = setInterval(fetchLiveTraffic, 60000);
    return () => clearInterval(interval);
  }, [provider, hazards.ready, hazards.active]);

  const onVote = async (id: string, vote: "yes" | "no") => {
    try {
      await provider.vote(id, vote);
      setToast(vote === "yes" ? "Thanks — confirmation recorded" : "Thanks — noted as resolved");
    } catch {
      setToast("Vote failed. Try again.");
    }
    window.setTimeout(() => setToast(null), 3000);
  };

  const handleLocate = () => {
    geo.request();
    if (geo.status === "denied") {
      setToast("Location permission denied. Use search or tap-map instead.");
    }
  };

  if (!isLoggedIn) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
         <style dangerouslySetInnerHTML={{ __html: "@keyframes fillProgress { 0% { width: 0%; } 15% { width: 30%; } 50% { width: 50%; } 80% { width: 90%; } 100% { width: 100%; } }" }} />
         <div style={{ fontSize: '80px', marginBottom: '24px', animation: 'pulse 1.5s infinite' }}>🛡️</div>
         <h1 style={{ fontSize: '42px', margin: '0 0 12px 0', letterSpacing: '-0.5px' }}>Safe-Route <span style={{ color: '#3b82f6' }}>Navigator</span></h1>
         <p style={{ color: '#94a3b8', fontSize: '20px', fontWeight: 500, marginBottom: '40px' }}>Intelligent routing with real-time safety tracking</p>
         
         <div style={{ width: '280px', height: '6px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#3b82f6', borderRadius: '4px', animation: 'fillProgress 2.5s ease-out forwards' }}></div>
         </div>
         <div style={{ marginTop: '16px', color: '#64748b', fontSize: '13px', fontWeight: 600, letterSpacing: '1px' }}>INITIALIZING ENGINE...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-lock">🛡️</span> Safe-Route{" "}
          <span className="brand-sub">Navigator</span>
        </div>
        <StatusBar
          providerName={provider.name}
          live={hazards.ready}
          conditions={conditions}
          hazardCount={active.length}
          tileSource={ctxSource === "osm" ? "osm" : ctxSource === "demo" ? "demo" : "none"}
        />
        <div className="top-actions" style={{ display: 'flex', gap: '8px' }}><button className="icon-btn" style={{ background: conditions.night ? '#1e293b' : '', color: conditions.night ? 'white' : '' }} onClick={() => setDemoNight(!conditions.night)} title="Simulate Night">🌙</button><button className="icon-btn" style={{ background: conditions.raining ? '#3b82f6' : '', color: conditions.raining ? 'white' : '' }} onClick={() => setDemoRain(!conditions.raining)} title="Simulate Rain">🌧️</button><button className="icon-btn" style={{ background: showHeatmap ? '#ef4444' : '', color: showHeatmap ? 'white' : '' }} onClick={() => setShowHeatmap(!showHeatmap)} title="Toggle Heatmap">🗺️</button><button className="icon-btn" style={{ background: showSafePlaces ? '#10b981' : '', color: showSafePlaces ? 'white' : '' }} onClick={() => setShowSafePlaces(!showSafePlaces)} title="Toggle Safe Places">🛡️</button><button className="icon-btn" onClick={handleLocate} title="Use my location">📍</button><button className="icon-btn" onClick={() => setPanel((p) => (p === 'info' ? 'routes' : 'info'))} title="How this works">ℹ️</button></div>
      </header>

      <div className="map-wrap">
        <MapView
          start={start}
          destination={destination}
          hazards={active}
          now={hazards.now}
          raining={conditions.raining}
          routes={routes}
          selectedRouteId={selection}
          mode={mode}
          pickMode={pickMode}
          onSelectRoute={setSelectedRouteId}
          onPickPoint={(p) => {
            if (pickMode) setPoint(pickMode, p);
          }}
          onReportAt={(p) => setReportPoint({ lat: p[0], lng: p[1] })}
          onVote={onVote}
          onHazardFocus={(h) => setFocusedHazard(h)} showHeatmap={showHeatmap} showSafePlaces={showSafePlaces} safePlacesList={safePlacesList}
          mapCenter={CAMPUS.center}
          currentLocation={geo.position}
        />
        <div className="map-float">
          <button className="fab" style={{ background: '#f59e0b', color: '#000', fontWeight: 'bold', width: 'auto', padding: '0 16px', borderRadius: '24px', marginBottom: '12px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)' }} onClick={() => setReportPoint({ lat: contextPoint[0], lng: contextPoint[1] })}>
              ⚠️ Report Hazard
            </button>
            <button className="fab" style={{ background: '#3b82f6', color: 'white', fontWeight: 'bold', width: 'auto', padding: '0 16px', borderRadius: '24px', marginBottom: '12px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }} onClick={handleNearestSafePlace}>
            🛡️ Nearest Safe Place
          </button>
          <button className="fab" onClick={handleLocate}
            title="Snap to my location"
          >
            📍
          </button>
          <Legend />
        </div>
      </div>

      <section className="sheet">
        <div className="sheet-tabs">
          <button
            className={panel === "routes" ? "tab-active" : ""}
            onClick={() => setPanel("routes")}
          >
            Routes
          </button>
          <button
            className={panel === "info" ? "tab-active" : ""}
            onClick={() => setPanel("info")}
          >
            How it works
          </button>
          <span className="sheet-meta">
            {startLabel} → {destLabel}
          </span>
        </div>

        {panel === "routes" ? (
          <div className="sheet-body">
            <SearchBar
              start={start}
              startLabel={startLabel}
              destination={destination}
              destLabel={destLabel}
              onSet={setPoint}
              onSwap={() => {
                const s = start;
                const sl = startLabel;
                setStart(destination);
                setStartLabel(destLabel);
                setDestination(s);
                setDestLabel(sl);
              }}
              onPickWithMap={(which) => {
                setPickMode((p) => (p === which ? null : which));
              }}
              pickMode={pickMode}
            />

            <ModeSelector
              mode={mode}
              onChange={setMode}
            />

            {selection && (
              <div className="confidence-note">
                Data confidence: <ConfidenceBadge level={selectionRoute(routes, selection)?.confidence ?? "limited"} inline /> |{" "}
                {confidenceHint(selectionRoute(routes, selection)?.confidence ?? "limited").toLowerCase()}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-around', background: 'transparent', padding: '12px 16px', borderBottom: '1px solid #334155', margin: '0 -16px 12px -16px' }}>
              {[
                { id: "driving", icon: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 12 10s-6.7.6-8.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><path d="m5 11 1.5-5.5C6.8 4.6 7.8 4 9 4h6c1.2 0 2.2.6 2.5 1.5L19 11"/><circle cx="6.5" cy="16.5" r="1.5"/><circle cx="17.5" cy="16.5" r="1.5"/></svg>, label: "Drive", title: "Car & Auto-rickshaw (estimate)" },
                { id: "bike", icon: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-3 11.5V14l-3-3 4-3 2 3h2"/><path d="m10.5 13.5-3-3"/></svg>, label: "Ride" },
                { id: "foot", icon: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><path d="m9 20 2.5-4L11 10.5 10 9 8 10"/><path d="m11 16 3-4.5L12 9l-2-2 1-3"/><path d="m15 11.5 2 1.5"/><path d="m15 20-3-5"/></svg>, label: "Walk" }
              ].map(m => {
                const isSelected = transportMode === m.id;
                const rList = routes?.filter(r => r.route.id.includes(m.id)) || [];
                const fastest = rList.length ? rList.reduce((a, b) => a.route.durationMin < b.route.durationMin ? a : b) : null;
                const eta = fastest ? (fastest.route.durationMin >= 60 ? `${Math.floor(fastest.route.durationMin / 60)}h ${Math.floor(fastest.route.durationMin % 60)}m` : `${Math.round(fastest.route.durationMin)} min`) : "--";
                return (
                  <div key={m.id} title={m.title || m.label} onClick={() => { setTransportMode(m.id as any); setSelectedRouteId(null); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', opacity: isSelected ? 1 : 0.4, transition: '0.2s', width: '33%', color: isSelected ? 'white' : '#94a3b8' }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>{m.icon}</div>
                    <div style={{ fontSize: '13px', fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? 'white' : '#94a3b8' }}>{eta}</div>
                  </div>
                );
              })}
            </div>

            <RouteList
              routes={routes ? routes.filter(r => r.route.id.includes(transportMode)) : null}
              selectedId={selection}
              mode={mode}
              conditions={conditions}
              onSelect={setSelectedRouteId}
              loading={loading}
              error={error}
            />          </div>
        ) : (
          <div className="sheet-body">
            <InfoSheet source={ctxSource} covered={Boolean(features.length)} />
          </div>
        )}
      </section>

      {reportPoint && (
        <ReportFlow
          point={reportPoint}
          provider={provider}
          raining={conditions.raining}
          reporterId={reporterId}
          onClose={() => setReportPoint(null)}
          onDone={() => {
            setReportPoint(null);
            setPanel("routes");
            setToast("Report live on every open map.");
            window.setTimeout(() => setToast(null), 3000);
          }}
        />
      )}

      
      {sosPlace && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#1e293b', borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)', border: '1px solid #334155', color: 'white', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
            <h2 style={{ margin: "0 0 8px 0", color: "#f8fafc" }}>Nearest Safe Place</h2>
            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', margin: '16px 0' }}>
               <div style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '18px', marginBottom: '4px' }}>{sosPlace.typeStr}</div>
               <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>{sosPlace.name}</div>
               <div style={{ color: '#94a3b8' }}>Only <strong style={{ color: '#10b981' }}>{sosPlace.distMeters}m</strong> away from your location.</div>
            </div>
            <p style={{ color: '#cbd5e1', marginBottom: '24px', fontSize: '14px' }}>Would you like to reroute here for immediate safety?</p>
            <div style={{ display: 'flex', gap: '12px' }}>
                 <button style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #475569', background: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setSosPlace(null)}>Cancel</button>
                 <button style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', background: '#22c55e', color: 'white', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(34, 197, 94, 0.3)' }} onClick={() => { 
                    setDestination([sosPlace.place.lat ?? sosPlace.place.center?.lat, sosPlace.place.lon ?? sosPlace.place.center?.lon]);
                    setSosPlace(null);
                 }}>🧭 Route Here</button>
              </div>
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function selectionRoute(
  routes: ReturnType<typeof useRouteFetch>["routes"],
  id: string | null
) {
  return routes?.find((r) => r.route.id === id) ?? null;
}

















