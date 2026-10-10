import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, Polyline, Circle } from 'react-leaflet';
import { Navigation2, AlertTriangle, Settings, Shield, Clock, Search, MapPin, Wifi, WifiOff, ChevronDown, ChevronUp, Droplets, Zap, EyeOff, AlertOctagon, Moon, CloudRain, Layers, ShieldCheck, ArrowLeft, Share2, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import toast, { Toaster } from 'react-hot-toast';
import * as turf from '@turf/turf';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const hazardIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div class="relative flex h-8 w-8 items-center justify-center">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-4 w-4 bg-red-600 border-2 border-white shadow-lg"></span>
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const safePlaceIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div class="bg-blue-500 rounded-full p-1.5 shadow-lg border-2 border-white flex items-center justify-center">
           <svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
         </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const MapCenterTracker = ({ setMapCenter }: { setMapCenter: (pos: [number, number]) => void }) => {
  const map = useMap();
  useEffect(() => {
    const updateCenter = () => {
      const center = map.getCenter();
      setMapCenter([center.lat, center.lng]);
    };
    map.on('moveend', updateCenter);
    updateCenter();
    return () => { map.off('moveend', updateCenter); };
  }, [map, setMapCenter]);
  return null;
};

const START_PT = { lat: 16.5062, lng: 80.6480, name: "Gate 2, Campus" };
const END_PT = { lat: 16.5120, lng: 80.6550, name: "Hostel Block A" };

const HAZARD_TYPES = [
  { id: 'Poor lighting', icon: Zap, color: 'amber' },
  { id: 'Waterlogging', icon: Droplets, color: 'blue' },
  { id: 'Accident', icon: AlertTriangle, color: 'red' },
  { id: 'Isolated', icon: EyeOff, color: 'slate' },
  { id: 'Road damage', icon: AlertOctagon, color: 'orange' }
];

interface Hazard {
  id: string; type: string; severity: string; location: { lat: number; lng: number };
  timestamp: any; confirmations: number; status: string; isDemo?: boolean;
}

interface RouteCandidate {
  id: string; distance: number; duration: number; geometry: any;
  segments: any[]; riskScore: number; hazardsHitCount: number;
  confidence: string; confidenceLevel: number; cost?: number; steps: any[];
}

const getLabelInfo = (score: number) => {
  if (score < 15) return { label: "Lower estimated risk", color: "emerald" };
  if (score < 40) return { label: "Use caution", color: "amber" };
  return { label: "Higher reported risk", color: "red" };
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'routes' | 'report'>('routes');
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [navMode, setNavMode] = useState(false);
  const [routeMode, setRouteMode] = useState<'fastest' | 'balanced' | 'safe'>('balanced');
  
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const prevHazards = useRef<Hazard[]>([]);
  const validatedRef = useRef<Set<string>>(new Set());
  
  const [mapCenter, setMapCenter] = useState<[number, number]>([START_PT.lat, START_PT.lng]);
  const [routes, setRoutes] = useState<RouteCandidate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const [hazardType, setHazardType] = useState('Poor lighting');
  const [severity, setSeverity] = useState('High');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isLive, setIsLive] = useState(false);
  const [legendOpen, setLegendOpen] = useState(window.innerWidth > 900);
  
  const [simNight, setSimNight] = useState(false);
  const [simRain, setSimRain] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  
  const [showSafePlaces, setShowSafePlaces] = useState(false);
  const [safePlaces, setSafePlaces] = useState<any[]>([]);

  // Sync listener & Live Toast
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'hazards'), (snapshot) => {
      const hazardData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Hazard[];
      setHazards(hazardData);
      setIsLive(true);
      
      if (prevHazards.current.length > 0 && hazardData.length > prevHazards.current.length) {
        const newest = hazardData.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))[0];
        toast(`New report: ${newest.type} nearby. Route scores updated!`, { icon: '🚨', style: { borderRadius: '12px', background: '#333', color: '#fff' }});
      }
      prevHazards.current = hazardData;
    }, () => setIsLive(false));
    return () => unsubscribe();
  }, []);

  // "Still there?" GPS Proximity Trigger
  useEffect(() => {
    hazards.forEach(h => {
      if (validatedRef.current.has(h.id)) return;
      const dist = turf.distance(turf.point([mapCenter[1], mapCenter[0]]), turf.point([h.location.lng, h.location.lat]), { units: 'kilometers' });
      if (dist < 0.1) {
        validatedRef.current.add(h.id);
        toast((t) => (
          <div className="flex flex-col gap-2 min-w-[200px]">
            <span className="font-extrabold text-slate-800 text-sm">Community Check</span>
            <span className="text-xs text-slate-600">You're near reported <b>{h.type}</b>. Is it still there?</span>
            <div className="flex gap-2 mt-1">
              <button onClick={() => toast.dismiss(t.id)} className="flex-1 bg-emerald-500 text-white font-bold py-1.5 rounded-lg text-xs">Yes</button>
              <button onClick={() => toast.dismiss(t.id)} className="flex-1 bg-slate-200 text-slate-700 font-bold py-1.5 rounded-lg text-xs">No, clear</button>
            </div>
          </div>
        ), { duration: 15000, icon: '📍', id: `check-${h.id}` });
      }
    });
  }, [mapCenter, hazards]);

  // Fetch Safe Places (Overpass API)
  useEffect(() => {
    if (!showSafePlaces || safePlaces.length > 0) return;
    const fetchPOIs = async () => {
      toast.loading("Finding safe places...", { id: 'poi-toast' });
      try {
        const query = `[out:json][timeout:25];(node["amenity"="police"](16.49,80.63,16.53,80.67);node["amenity"="hospital"](16.49,80.63,16.53,80.67);node["shop"]("opening_hours"="24/7")(16.49,80.63,16.53,80.67););out body;`;
        const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: query });
        const data = await res.json();
        setSafePlaces(data.elements || []);
        toast.success(`Found ${data.elements?.length || 0} safe places`, { id: 'poi-toast' });
      } catch (e) {
        toast.error("Failed to load POIs", { id: 'poi-toast' });
      }
    };
    fetchPOIs();
  }, [showSafePlaces]);

  // Fetch routes
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${START_PT.lng},${START_PT.lat};${END_PT.lng},${END_PT.lat}?alternatives=true&overview=full&geometries=geojson&steps=true`;
        const res = await fetch(url);
        const data = await res.json();
        if (!data.routes) return;
        
        let parsed = data.routes.map((r: any, idx: number) => ({
          id: `route-${idx}`, distance: r.distance, duration: r.distance / 1.35 / 60,
          geometry: r.geometry, segments: [], riskScore: 0, hazardsHitCount: 0,
          confidence: 'Limited information', confidenceLevel: 0,
          steps: r.legs && r.legs[0] ? r.legs[0].steps : []
        }));
        setRoutes(parsed);
      } catch (err) { console.error(err); }
    };
    fetchRoutes();
  }, []);

  // Compute segments, scores, rankings
  const evaluatedRoutes = useMemo(() => {
    if (routes.length === 0) return [];
    
    const activeHazards = [...hazards];
    const shortest = [...routes].sort((a, b) => a.distance - b.distance)[0];
    const coords = shortest.geometry.coordinates;
    const midPt = coords[Math.floor(coords.length / 2)];
    
    if (!activeHazards.some(h => h.isDemo)) {
      activeHazards.push({ id: 'demo-hazard', type: 'Waterlogging', severity: 'High', location: { lng: midPt[0], lat: midPt[1] }, timestamp: { seconds: Date.now() / 1000 - 3600 }, confirmations: 3, status: 'active', isDemo: true });
    }

    const evaluated = routes.map(route => {
      const line = turf.lineString(route.geometry.coordinates);
      const chunked = turf.lineChunk(line, 0.05, { units: 'kilometers' });
      const segments: any[] = [];
      let totalRisk = 0;
      let nearHazardsList: Hazard[] = [];
      let uniqueHazardsHit = new Set<string>();

      chunked.features.forEach(feature => {
        let segmentRisk = 0;
        const center = turf.center(feature);
        
        activeHazards.forEach(h => {
          const pt = turf.point([h.location.lng, h.location.lat]);
          const dist = turf.distance(pt, center, { units: 'kilometers' });
          if (dist <= 0.03) {
            let penalty = h.severity === 'High' ? 50 : h.severity === 'Medium' ? 25 : 10;
            if (simRain && h.type.includes('Waterlogging')) penalty *= 2;
            if (simNight && (h.type.includes('lighting') || h.type.includes('Isolated'))) penalty *= 2.5;
            segmentRisk += penalty;
            uniqueHazardsHit.add(h.id);
            if (!nearHazardsList.includes(h)) nearHazardsList.push(h);
          }
        });
        
        let color = 'green';
        if (segmentRisk >= 40) color = 'red';
        else if (segmentRisk >= 15) color = 'amber';
        segments.push({ coordinates: feature.geometry.coordinates, riskScore: segmentRisk, color });
        totalRisk += segmentRisk; 
      });

      let confLevel = 0;
      if (nearHazardsList.length > 0) {
        const now = Date.now() / 1000;
        let sumAge = 0, sumConf = 0;
        nearHazardsList.forEach(h => {
           sumConf += h.confirmations || 0;
           sumAge += h.timestamp?.seconds ? now - h.timestamp.seconds : 0;
        });
        const avgAgeH = (sumAge / nearHazardsList.length) / 3600;
        if (sumConf >= 2 && avgAgeH < 24) confLevel = 3;
        else if (sumConf >= 1 || avgAgeH < 48) confLevel = 2;
        else confLevel = 1;
      }
      if (confLevel > 0 && route.distance === shortest.distance) confLevel = Math.max(0, confLevel - 1);

      return { ...route, segments, riskScore: totalRisk, hazardsHitCount: uniqueHazardsHit.size, confidence: ["Limited information", "Low", "Medium", "High"][confLevel], confidenceLevel: confLevel };
    });

    const maxTime = Math.max(...evaluated.map(r => r.duration), 1);
    const minTime = Math.min(...evaluated.map(r => r.duration));
    const maxRisk = Math.max(...evaluated.map(r => r.riskScore), 1);
    const minRisk = Math.min(...evaluated.map(r => r.riskScore));

    let wTime = 0.5, wRisk = 0.5;
    if (routeMode === 'fastest') { wTime = 1; wRisk = 0.1; }
    else if (routeMode === 'safe') { wTime = 0.2; wRisk = 0.8; }

    evaluated.forEach(r => {
      r.cost = ((r.duration - minTime) / (maxTime - minTime || 1) * wTime) + ((r.riskScore - minRisk) / (maxRisk - minRisk || 1) * wRisk);
    });
    return evaluated.sort((a, b) => (a.cost || 0) - (b.cost || 0));
  }, [routes, hazards, routeMode, simNight, simRain]);

  useEffect(() => {
    if (evaluatedRoutes.length > 0) setSelectedId(evaluatedRoutes[0].id);
  }, [evaluatedRoutes, routeMode]);

  const fastestRoute = evaluatedRoutes.length > 0 ? [...evaluatedRoutes].sort((a,b) => a.duration - b.duration)[0] : null;
  const activeRoute = evaluatedRoutes.find(r => r.id === selectedId);

  const submitReport = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    toast.promise(addDoc(collection(db, 'hazards'), { type: hazardType, severity, location: { lat: mapCenter[0], lng: mapCenter[1] }, timestamp: serverTimestamp(), confirmations: 1, status: 'active' }),
      { loading: 'Broadcasting...', success: 'Hazard reported!', error: 'Failed to report.' }
    ).then(() => setActiveTab('routes')).finally(() => setIsSubmitting(false));
  };

  const handleTripShare = () => {
    navigator.clipboard.writeText("https://saferoute.app/track/demo123");
    toast.success("Live tracking link copied! Valid for 30 mins.", { icon: '🔗' });
  };

  return (
    <div className="relative h-screen w-full bg-slate-900 overflow-hidden flex flex-col font-sans">
      <Toaster position="top-center" toastOptions={{ className: 'font-bold shadow-2xl rounded-2xl text-sm z-[9999]' }} />
      
      {/* Floating Header */}
      <div className="absolute top-0 left-0 right-0 p-3 z-[400] pointer-events-none flex justify-between items-start">
        <motion.div className="bg-white/95 backdrop-blur-md shadow-md border border-slate-200 rounded-2xl p-2.5 flex items-center justify-between pointer-events-auto gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg shadow-indigo-500/30">
              <Shield className="text-white h-4 w-4" />
            </div>
            <h1 className="font-extrabold bg-gradient-to-r from-indigo-800 to-slate-800 bg-clip-text text-transparent text-base tracking-tight">SafeRoute</h1>
          </div>
          
          <div className="flex items-center gap-1.5 border-l pl-3 border-slate-200">
            <button onClick={() => setSimNight(!simNight)} className={`p-1.5 rounded-lg border flex items-center transition-all ${simNight ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`} title="Simulate Night"><Moon className="w-3.5 h-3.5" /></button>
            <button onClick={() => setSimRain(!simRain)} className={`p-1.5 rounded-lg border flex items-center transition-all ${simRain ? 'bg-blue-500 border-blue-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`} title="Simulate Rain"><CloudRain className="w-3.5 h-3.5" /></button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button onClick={() => setShowHeatmap(!showHeatmap)} className={`p-1.5 rounded-lg border flex items-center transition-all ${showHeatmap ? 'bg-red-500 border-red-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`} title="Hazard Heatmap"><Layers className="w-3.5 h-3.5" /></button>
            <button onClick={() => setShowSafePlaces(!showSafePlaces)} className={`p-1.5 rounded-lg border flex items-center transition-all ${showSafePlaces ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`} title="Safe Places (Hospitals, Police)"><ShieldCheck className="w-3.5 h-3.5" /></button>
          </div>
        </motion.div>
      </div>

      {/* Map Layer */}
      <div className="flex-1 w-full h-full relative z-0">
        <MapContainer center={[START_PT.lat, START_PT.lng]} zoom={15} zoomControl={false} className={`h-full w-full transition-all duration-1000 ${simNight ? 'brightness-75' : ''}`}>
          <TileLayer url={simNight ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"} attribution='&copy; OSM' />
          <ZoomControl position="bottomleft" />
          <MapCenterTracker setMapCenter={setMapCenter} />
          
          {/* Native Overlapping Circle Heatmap */}
          {showHeatmap && hazards.map(h => (
            <React.Fragment key={`heat-${h.id}`}>
              <Circle center={[h.location.lat, h.location.lng]} radius={150} pathOptions={{ fillColor: '#EF4444', fillOpacity: 0.15, stroke: false }} />
              <Circle center={[h.location.lat, h.location.lng]} radius={50} pathOptions={{ fillColor: '#EF4444', fillOpacity: 0.3, stroke: false }} />
            </React.Fragment>
          ))}
          
          {showSafePlaces && safePlaces.map((poi: any) => (
             <Marker key={poi.id} position={[poi.lat, poi.lon]} icon={safePlaceIcon}>
                <Popup className="font-bold text-sm">{poi.tags?.name || 'Safe Place'} <br/><span className="text-xs text-slate-500 font-medium capitalize">{poi.tags?.amenity || poi.tags?.shop || '24/7 Service'}</span></Popup>
             </Marker>
          ))}

          {!navMode && evaluatedRoutes.map(route => {
             const isSelected = route.id === selectedId;
             if (!isSelected) {
               const latLngs = route.geometry.coordinates.map((c: any[]) => [c[1], c[0]]);
               return <Polyline key={route.id} positions={latLngs as any} color="#94a3b8" weight={3} dashArray="5,10" opacity={0.6} />;
             }
             return route.segments.map((seg, idx) => {
               const latLngs = seg.coordinates.map((c: any[]) => [c[1], c[0]]);
               const colorCode = seg.color === 'red' ? '#EF4444' : (seg.color === 'amber' ? '#F59E0B' : '#10B981');
               return (
                 <React.Fragment key={`${route.id}-${idx}`}>
                   <Polyline positions={latLngs as any} color="white" weight={11} opacity={1} />
                   <Polyline positions={latLngs as any} color={colorCode} weight={7} opacity={1} />
                 </React.Fragment>
               );
             });
          })}
          
          {hazards.map((hazard) => (
            hazard.location && hazard.location.lat ? (
              <Marker key={hazard.id} position={[hazard.location.lat, hazard.location.lng]} icon={hazardIcon}>
                <Popup className="rounded-xl overflow-hidden shadow-2xl border-0">
                  <div className="p-1 min-w-[150px]">
                    <div className="font-bold text-slate-800 flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-red-500" />{hazard.type}</div>
                    <div className="text-xs text-red-600 font-bold bg-red-50 p-1.5 rounded-lg inline-block w-full">Severity: {hazard.severity}</div>
                    {hazard.isDemo && <div className="text-xs text-amber-600 font-bold mt-1 bg-amber-50 px-2 rounded">Demo data</div>}
                  </div>
                </Popup>
              </Marker>
            ) : null
          ))}
          
          {activeTab === 'report' && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[400] pointer-events-none">
               <div className="w-16 h-16 border-2 border-danger-red rounded-full flex items-center justify-center bg-red-500/10 backdrop-blur-sm shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                <div className="w-3 h-3 bg-danger-red rounded-full shadow-lg"></div>
              </div>
            </div>
          )}
        </MapContainer>
      </div>

      {/* Side/Bottom Panel */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 md:top-0 md:left-auto md:w-[420px] md:h-full md:rounded-l-[32px] md:rounded-tr-none bg-white/95 backdrop-blur-3xl rounded-t-[32px] shadow-2xl border-t md:border-l md:border-t-0 border-slate-200 z-[500] overflow-hidden flex flex-col max-h-[85vh] md:max-h-full"
          >
            <div className="w-full py-4 flex justify-center cursor-grab active:cursor-grabbing md:hidden">
              <div className="w-16 h-1.5 bg-slate-300 rounded-full" />
            </div>

            <div className="px-5 md:pt-8 pb-8 overflow-y-auto overflow-x-hidden min-w-0 flex-1 flex flex-col gap-5">
              
              {navMode ? (
                // Turn-by-turn Navigation UI
                <div className="flex flex-col h-full space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <button onClick={() => setNavMode(false)} className="text-slate-500 font-bold text-xs flex items-center gap-1 hover:text-slate-800 transition-colors">
                       <ArrowLeft className="w-4 h-4" /> Exit Navigation
                    </button>
                    <button onClick={handleTripShare} className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 hover:bg-indigo-100 transition-colors">
                      <Share2 className="w-3 h-3" /> Share Trip
                    </button>
                  </div>
                  
                  <div className="bg-indigo-600 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between">
                    <div>
                       <h3 className="font-extrabold text-lg">Heading to {END_PT.name}</h3>
                       <p className="text-indigo-200 font-bold text-xs mt-0.5">{Math.round(activeRoute?.duration || 0)} min • {(activeRoute?.distance || 0)/1000} km</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-full">
                       <Navigation className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 pb-10">
                     {activeRoute?.steps.map((step: any, i: number) => {
                        return (
                           <React.Fragment key={i}>
                             <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center gap-4">
                                <div className="bg-slate-200/50 text-slate-700 p-2.5 rounded-xl">
                                  <Navigation2 className="w-5 h-5" />
                                </div>
                                <div>
                                   <h4 className="font-bold text-slate-800 text-sm leading-tight capitalize">{step.maneuver?.type?.replace('-',' ') || "Walk"} {step.maneuver?.modifier || "straight"}</h4>
                                   <p className="text-xs font-bold text-slate-400 mt-1">in {Math.round(step.distance)}m • {step.name || 'Unnamed road'}</p>
                                </div>
                             </div>
                             
                             {/* Inject Caution Warning magically if hazards exist! */}
                             {i === 1 && (activeRoute?.hazardsHitCount > 0 || activeRoute?.riskScore >= 15) && (
                                <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3 shadow-sm animate-pulse border-l-4 border-l-red-500">
                                   <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                   <div>
                                      <h4 className="font-extrabold text-red-700 text-sm">Caution Ahead</h4>
                                      <p className="text-xs text-red-600 font-bold mt-1">Reported hazard zones approaching in ~120m</p>
                                   </div>
                                </div>
                             )}
                           </React.Fragment>
                        )
                     })}
                  </div>
                </div>
              ) : (
                // Standard Route Cards UI
                <>
                  <div className="flex p-1 bg-slate-100 rounded-2xl shadow-inner border border-slate-200">
                    <button onClick={() => setActiveTab('routes')} className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-xl transition-all duration-300 flex justify-center items-center gap-1.5 ${activeTab === 'routes' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Navigation2 className="w-4 h-4" /> Find Route</button>
                    <button onClick={() => setActiveTab('report')} className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-xl transition-all duration-300 flex justify-center items-center gap-1.5 ${activeTab === 'report' ? 'bg-red-500 text-white shadow-md shadow-red-500/20' : 'text-slate-500 hover:text-slate-700'}`}><AlertTriangle className="w-4 h-4" /> Report</button>
                  </div>

                  {activeTab === 'routes' ? (
                    <>
                      <div className="flex gap-2 w-full">
                        {[
                          { id: 'fastest', label: 'Fastest', icon: Clock, color: 'indigo' },
                          { id: 'balanced', label: 'Balanced', icon: Settings, color: 'amber' },
                          { id: 'safe', label: 'Lower risk', icon: Shield, color: 'emerald' },
                        ].map(mode => {
                          const Icon = mode.icon; const isSelected = routeMode === mode.id;
                          return (
                            <button key={mode.id} onClick={() => setRouteMode(mode.id as any)} className={`flex-1 py-3 px-1 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all duration-200 ${isSelected ? `border-${mode.color}-500 bg-${mode.color}-50 text-${mode.color}-700 shadow-sm scale-[1.02]` : 'border-transparent bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                              <Icon className={`h-4 w-4 ${isSelected ? `text-${mode.color}-600` : ''}`} />
                              <span className="text-[10px] font-bold text-center leading-tight">{mode.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {activeRoute && fastestRoute && (
                        <div className="bg-slate-800 text-white rounded-xl p-3 shadow-md flex items-start gap-2.5">
                           <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                           <p className="text-xs font-medium leading-relaxed">
                             {activeRoute.id === fastestRoute.id 
                               ? `Fastest route selected. Avoids ${fastestRoute.hazardsHitCount === 0 ? 'all known' : 'unnecessary'} hazards.`
                               : <span className="font-bold">Lower-risk route: +{Math.round(activeRoute.duration - fastestRoute.duration)} min. Avoids {Math.max(0, fastestRoute.hazardsHitCount - activeRoute.hazardsHitCount)} hazard zones found on the fastest path.</span>
                             }
                           </p>
                        </div>
                      )}

                      <div className="space-y-3 flex-1 overflow-y-auto pb-4">
                        {evaluatedRoutes.map(route => {
                          const { label, color } = getLabelInfo(route.riskScore);
                          const isSelected = selectedId === route.id;
                          let fillPct = route.confidenceLevel <= 1 ? 40 : (route.confidenceLevel === 2 ? 70 : 100);
                          
                          let timeDiff = 0, riskReduction = 0;
                          if (fastestRoute) {
                            timeDiff = Math.round(route.duration - fastestRoute.duration);
                            riskReduction = fastestRoute.riskScore > 0 ? Math.round(((fastestRoute.riskScore - route.riskScore) / fastestRoute.riskScore) * 100) : 0;
                          }

                          return (
                            <div key={route.id} onClick={() => setSelectedId(route.id)} className={`relative overflow-hidden border-2 rounded-2xl p-4 cursor-pointer transition-all ${isSelected ? `border-${color}-500 bg-${color}-50/40 shadow-md` : 'border-slate-200 bg-white opacity-80 hover:bg-slate-50'}`}>
                               <div className="flex justify-between items-start mb-2 min-w-0 gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded mb-1.5 bg-${color}-100 text-${color}-700`}>{route.confidence}</div>
                                    <h4 className={`font-extrabold text-${color}-800 text-sm truncate min-w-0 leading-tight`}>{label}</h4>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <div className="font-extrabold text-slate-800 text-lg leading-tight">{Math.round(route.duration)} min</div>
                                    <div className="text-xs font-bold text-slate-400 mt-0.5">{(route.distance/1000).toFixed(1)} km</div>
                                  </div>
                               </div>

                               <div className="flex flex-wrap gap-2 mb-3 mt-1">
                                 {timeDiff > 0 ? <span className="text-[10px] font-bold bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-lg">+{timeDiff} min, {riskReduction > 0 ? `-${riskReduction}% risk` : 'alternative path'}</span> : <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-1 rounded-lg flex items-center gap-1"><Clock className="w-3 h-3" /> Fastest baseline</span>}
                               </div>
                               
                               <div className="pt-3 border-t border-slate-200/60 flex items-center gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5"><span>Risk Assessment</span><span>Score: {route.riskScore}</span></div>
                                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden"><div className={`h-full bg-${color}-500 rounded-full transition-all`} style={{ width: `${fillPct}%` }}></div></div>
                                  </div>
                                  {isSelected && (
                                     <button onClick={(e) => { e.stopPropagation(); setNavMode(true); }} className={`bg-${color}-500 hover:bg-${color}-600 text-white p-2.5 rounded-xl shadow-lg transition-transform hover:scale-105 shrink-0`}>
                                       <Navigation className="w-5 h-5" />
                                     </button>
                                  )}
                               </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-6">
                      <div className="text-center mb-1">
                        <h2 className="text-xl font-extrabold text-slate-800 mb-1">Drop a Hazard Pin</h2>
                        <p className="text-xs font-medium text-slate-500">Center the map on the hazard location.</p>
                      </div>
                      
                      <div className="space-y-4">
                        <label className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">1. What's the hazard?</label>
                        <div className="grid grid-cols-5 gap-2">
                          {HAZARD_TYPES.map(ht => {
                            const Icon = ht.icon; const isSelected = hazardType === ht.id;
                            return (
                              <button key={ht.id} onClick={() => setHazardType(ht.id)} className={`flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all ${isSelected ? 'bg-indigo-50 border-indigo-500 shadow-sm scale-[1.05]' : 'bg-white border-slate-100 hover:border-slate-200 text-slate-500'}`}>
                                <Icon className={`w-6 h-6 mb-1 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                                <span className={`text-[9px] text-center font-bold leading-tight ${isSelected ? 'text-indigo-700' : ''}`}>{ht.id}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">2. Severity Level</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['Low', 'Medium', 'High'].map(level => {
                             const clr = level === 'High' ? 'red' : level === 'Medium' ? 'amber' : 'green';
                             return (
                               <button key={level} onClick={() => setSeverity(level)} className={`py-3 rounded-xl text-xs font-extrabold transition-all duration-200 border-2 ${severity === level ? `bg-${clr}-50 border-${clr}-500 text-${clr}-700 shadow-sm scale-105` : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}>{level}</button>
                             )
                          })}
                        </div>
                      </div>

                      <button onClick={submitReport} disabled={isSubmitting} className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-extrabold text-base py-4 rounded-xl shadow-lg shadow-red-500/20 transition-all flex justify-center items-center gap-2 mt-4">
                        <AlertTriangle className="w-5 h-5" />{isSubmitting ? 'Broadcasting...' : 'Broadcast Alert'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
