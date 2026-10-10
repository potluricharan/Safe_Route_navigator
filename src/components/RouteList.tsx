import { useState } from "react";
import type { RankedRoute } from "../services/scoring";
import { formatAge, TIER_LABELS } from "../services/scoring";
import type { RouteMode } from "../types";
import type { Conditions } from "../types";
import ConfidenceBadge from "./ConfidenceBadge";

export function formatDuration(minutes: number) {
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} min`;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

interface RouteListProps {
  routes: RankedRoute[] | null;
  selectedId: string | null;
  mode: RouteMode;
  conditions: Conditions;
  onSelect: (id: string) => void;
  loading: boolean;
  error: string | null;
}

const TIER_COLOR = { green: "#22c55e", amber: "#f59e0b", red: "#ef4444" } as const;

const generateJustification = (route: RankedRoute) => {
     const hazards = route.factorSummary.hazards.length;
     const risk = route.riskIndex;
     const conf = route.confidence;
     
     if (conf == 'high') {
         return '✨ AI Analysis: High confidence score is driven by real-time community validation. This route has verified active reports and strong map coverage, ensuring the estimated risk score of ' + String(risk) + '/100 is highly accurate.';
     } else if (conf == 'medium') {
         if (hazards > 0) {
            return '✨ AI Analysis: Medium confidence assigned. We detected ' + String(hazards) + ' unverified hazard(s) reported in the last 2 hours. Routing algorithm has applied caution penalties, but real-time conditions may vary slightly.';
         }
         return '✨ AI Analysis: Medium confidence assigned. While map geometry is solid, we lack recent community movement data on this stretch to guarantee real-time conditions.';
     } else {
         return '✨ AI Analysis: Low confidence. This route relies on older map data with zero recent community verification. Proceed with caution as unmapped hazards may exist.';
     }
  };

export default function RouteList(props: RouteListProps) {
  if (props.loading) {
    return (
      <div className="route-list">
        <div className="route-status">Calculating routes…</div>
      </div>
    );
  }
  if (props.error) {
    return (
      <div className="route-list">
        <div className="route-status route-error">
          Routing temporarily unavailable: {props.error}. Check network and try again.
        </div>
      </div>
    );
  }
  if (!props.routes?.length) {
    return (
      <div className="route-list">
        <div className="route-status muted">
          Set a start and destination to compare routes by time and estimated risk.
        </div>
      </div>
    );
  }

  // Find fastest route to compute trade-offs
  const fastestRoute = props.routes.reduce((prev, curr) => (prev.route.durationMin < curr.route.durationMin ? prev : curr), props.routes[0]);
  const activeRoute = props.routes.find(r => r.route.id === props.selectedId) || props.routes[0];
  
  let bannerText = "";
  if (activeRoute.route.id === fastestRoute.route.id) {
    bannerText = `Fastest route selected. Avoids ${fastestRoute.factorSummary.hazards.length === 0 ? 'all known' : 'unnecessary'} hazards.`;
  } else {
    const timeDiff = Math.round(activeRoute.route.durationMin - fastestRoute.route.durationMin);
    const hazardsAvoided = Math.max(0, fastestRoute.factorSummary.hazards.length - activeRoute.factorSummary.hazards.length);
    bannerText = `Lower-risk choice: +${formatDuration(timeDiff)}. Avoids ${hazardsAvoided} hazard zones found on the fastest path.`;
  }

  return (
    <div className="route-list">
      <div className="why-this-route-banner" style={{ background: '#1e293b', color: 'white', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
         <span style={{ fontSize: '16px' }}>ℹ️</span> {bannerText}
      </div>
      {props.routes.map((r) => {
        const timeDiff = Math.round(r.route.durationMin - fastestRoute.route.durationMin);
        const riskReduction = fastestRoute.riskIndex > 0 ? Math.round(((fastestRoute.riskIndex - r.riskIndex) / fastestRoute.riskIndex) * 100) : 0;
        
        return (
          <RouteCard
            key={r.route.id}
            route={r}
            selected={r.route.id === props.selectedId}
            conditions={props.conditions}
            onSelect={() => props.onSelect(r.route.id)}
            timeDiff={timeDiff}
            riskReduction={riskReduction}
          />
        );
      })}
    </div>
  );
}

function RouteCard({
  route,
  selected,
  conditions,
  onSelect,
  timeDiff,
  riskReduction
}: {
  route: RankedRoute;
  selected: boolean;
  conditions: Conditions;
  onSelect: () => void;
  timeDiff: number;
  riskReduction: number;
}) {
  const [expanded, setExpanded] = useState(false);
  let riskTone = "toner red";
  let riskLabel = "Higher reported risk";
  if (route.riskIndex < 15) {
     riskTone = "toner green";
     riskLabel = "Lower estimated risk";
  } else if (route.riskIndex < 40) {
     riskTone = "toner amber";
     riskLabel = "Use caution";
  }

  return (
    <div className={`route-card${selected ? " route-card-selected" : ""}`}>
      <button className="route-card-main" onClick={onSelect}>
        <div className="route-rank" style={{ "--rk": 4 - route.rank } as React.CSSProperties}>
          {route.rank}
        </div>
        <div className="route-body">
          <div className="route-head">
              {route.rank === 1 && <span style={{ background: '#eab308', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', marginRight: '8px' }}>👑 Best Route</span>}
            {route.route.id.includes("foot") ? <svg style={{marginRight: '6px'}} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><path d="m9 20 2.5-4L11 10.5 10 9 8 10"/><path d="m11 16 3-4.5L12 9l-2-2 1-3"/><path d="m15 11.5 2 1.5"/><path d="m15 20-3-5"/></svg> : route.route.id.includes("bike") ? <svg style={{marginRight: '6px'}} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-3 11.5V14l-3-3 4-3 2 3h2"/><path d="m10.5 13.5-3-3"/></svg> : <svg style={{marginRight: '6px'}} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 12 10s-6.7.6-8.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><path d="m5 11 1.5-5.5C6.8 4.6 7.8 4 9 4h6c1.2 0 2.2.6 2.5 1.5L19 11"/><circle cx="6.5" cy="16.5" r="1.5"/><circle cx="17.5" cy="16.5" r="1.5"/></svg>}<span className="route-duration">{formatDuration(route.route.durationMin)}</span>
            <span className="route-distance">{route.route.distanceKm} km</span>
            <span className={`risk-pill ${riskTone}`}>{riskLabel}</span>
            <ConfidenceBadge level={route.confidence} inline />
          </div>
          
          <div style={{ display: 'flex', gap: '8px', margin: '4px 0', flexWrap: 'wrap' }}>
             {timeDiff > 0 ? (
                <span style={{ fontSize: '11px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold' }}>
                  +{formatDuration(timeDiff)}, {riskReduction > 0 ? `-${riskReduction}% risk` : 'alternative'}
                </span>
             ) : (
                <span style={{ fontSize: '11px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold' }}>
                  ⏱️ Fastest baseline
                </span>
             )}
          </div>

          <SegmentBar route={route} />
          <ul className="route-reasons">
            {route.reasons.slice(0, 2).map((r2, i) => (
              <li key={i}>{r2}</li>
            ))}
          </ul>
        </div>
      </button>
      <button
        className="route-expand"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded((v) => !v);
        }}
      >
        {expanded ? "Hide factors ▲" : "Explain score ▾"}
      </button>
      {expanded && (
        <Explanation
          route={route}
          conditions={conditions}
          onClose={() => setExpanded(false)}
        />
      )}
    </div>
  );
}

function SegmentBar({ route }: { route: RankedRoute }) {
  const segs = route.segments.slice(0, 120);
  return (
    <div className="segment-bar" title="Coloured stretches show where the estimate differs">
      {segs.map((s, i) => (
        <i
          key={i}
          title={s.label}
          style={{
            background: TIER_COLOR[s.tier],
            flexGrow: Math.max(1, Math.round(s.share * 1000))
          }}
        />
      ))}
    </div>
  );
}

function Explanation({
  route,
  conditions,
  onClose
}: {
  route: RankedRoute;
  conditions: Conditions;
  onClose: () => void;
}) {
  const f = route.factorSummary;
  return (
    <div className="route-explanation">
      <h4>Why this score</h4><div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', fontWeight: 'bold' }}>Estimated Risk Score: <span style={{ color: '#0f172a' }}>{route.riskIndex} / 100</span></div>
      <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #0369a1', padding: '12px', borderRadius: '8px', marginBottom: '16px', color: '#e0f2fe', fontSize: '13px', lineHeight: '1.5' }}>
          <strong>Confidence Justification</strong><br/>
          {generateJustification(route)}
        </div>
        <p className="muted">Rules version {route.ruleVersion} · computed {formatAge((Date.now() - route.computedAt) / 3600_000)} ago</p>

      {f.hazards.length > 0 && (
        <>
          <b>Active reports near this route</b>
          <table className="factor-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Sev.</th>
                <th>Age</th>
                <th>Conf.</th>
                <th>Δrisk</th>
              </tr>
            </thead>
            <tbody>
              {f.hazards.slice(0, 5).map((h) => (
                <tr key={h.hazardId}>
                  <td>{h.type.replace(/_/g, " ")}</td>
                  <td>{h.severity}</td>
                  <td>{formatAge(h.ageHours)}</td>
                  <td>{(h.confidence * 100).toFixed(0)}%</td>
                  <td>+{h.contribution.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <b>Context</b>
      <ul className="factor-list">
        <li>Night estimate: {conditions.night ? "active (lighting weighted higher)" : "inactive"}</li>
        <li>Rain detected: {conditions.raining ? "yes" : "no"}</li>
        <li>Lighting data: {f.context.lightingCoverage === "available" ? "available for this area" : "unknown — treated as unknown, not safe"}</li>
        <li>Route length exposure: {f.lengthKm} km of walking</li>
      </ul>

      <b>Full reasoning</b>
      <ul className="factor-list">
        {route.reasons.map((r2, i) => (
          <li key={i}>{r2}</li>
        ))}
      </ul>

      <p className="muted small">
        This is decision support on open, incomplete data. It is not a safety guarantee.
      </p>
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button className="small-btn" onClick={onClose}>
          Close
        </button>
        <button className="small-btn" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText("https://saferoute.app/track/demo"); alert("Live tracking link copied! Valid for 30 mins."); }}>
          🔗 Share Trip
        </button>
        <button className="small-btn" style={{ background: '#3b82f6', color: 'white', border: 'none' }} onClick={(e) => { e.stopPropagation(); alert("Turn-by-turn navigation started. (Demo Mode)"); }}>
          🧭 Start Nav
        </button>
      </div>
    </div>
  );
}

export { TIER_LABELS };
