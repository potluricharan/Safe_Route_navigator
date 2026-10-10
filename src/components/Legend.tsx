import { HAZARD_TYPE_RULES, SEVERITY_WEIGHTS } from "../config/app";

export function Legend() {
  return (
    <div className="legend">
      <div className="legend-row">
        <i className="sw" style={{ background: "#22c55e" }} />
        <span><b>Lower estimated risk</b> — few or no active reports on this stretch</span>
      </div>
      <div className="legend-row">
        <i className="sw" style={{ background: "#f59e0b" }} />
        <span><b>Use caution</b> — some active or lower-confidence reports</span>
      </div>
      <div className="legend-row">
        <i className="sw" style={{ background: "#ef4444" }} />
        <span><b>Higher reported risk</b> — recent, confirmed or high-severity reports</span>
      </div>
      <p className="muted small">
        Green never means “safe”. A road with no reports may simply have no data.
      </p>
    </div>
  );
}

export function InfoSheet({ source, covered }: { source: string; covered: boolean }) {
  return (
    <div className="info-sheet">
      <h3>How this works</h3>
      <p>
        The app shows 2–3 walking routes and estimates risk on each stretch. It blends
        community reports with time-of-day, rainfall and street context, then explains every
        score. Routing, scoring and validation are meant to run on the backend so the client
        cannot alter official estimates; this prototype runs the same rule engine for the demo.
      </p>

      <h4>Estimated risk per stretch</h4>
      <code className="formula">
        segment risk = severity × confidence × freshness + context penalties − verified benefits
      </code>
      <p className="muted small">
        Weights are calibrated by tests, not presented as scientifically validated.
      </p>

      <h4>Hazard categories &amp; expiry</h4>
      <table className="factor-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Base weight</th>
            <th>Expiry</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(HAZARD_TYPE_RULES).map(([k, r]) => (
            <tr key={k}>
              <td>{r.icon} {r.shortLabel}</td>
              <td>{SEVERITY_WEIGHTS.medium.toFixed(1)} base ×{r.temporary ? " decay" : " slow decay"}</td>
              <td>{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4>Data confidence</h4>
      <p>
        Shown separately from the risk score: it reflects report recency, the number and
        independence of confirmations, and how much map data exists. Missing lighting data is
        marked <b>unknown</b>, never silently treated as safe or dangerous. Low report volume is
        not the same as low risk.
      </p>

      <h4>Privacy</h4>
      <ul className="factor-list">
        <li>GPS is requested only when you tap “locate”, and only for a single fix.</li>
        <li>No continuous location trail is stored by default.</li>
        <li>Reporting uses anonymous sign-in; reporter identities are never shown publicly.</li>
        <li>Rate limits, duplicate merging and confirmation votes guard against spam.</li>
      </ul>

      <h4>Data sources</h4>
      <ul className="factor-list">
        <li>Map tiles &amp; street data: OpenStreetMap contributors</li>
        <li>Routing: OSRM (public demo server); optional OpenRouteService for hazard-avoiding routes</li>
        <li>Geocoding: Nominatim / seeded campus landmarks</li>
        <li>Weather: Open-Meteo · Night: solar position calculation</li>
        <li>Static context source: {source}{covered ? "" : " (lighting coverage limited)"}</li>
      </ul>

      <p className="warn">
        This is decision support on open, possibly incomplete data. It does not guarantee that
        any route is safe.
      </p>
    </div>
  );
}