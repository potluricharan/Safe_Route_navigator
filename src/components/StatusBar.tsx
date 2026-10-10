import type { Conditions } from "../types";

export default function StatusBar({
  providerName,
  live,
  conditions,
  hazardCount,
  tileSource
}: {
  providerName: string;
  live: boolean;
  conditions: Conditions;
  hazardCount: number;
  tileSource: string;
}) {
  return (
    <div className="status-bar">
      <span className={`live-dot${live ? " live-on" : ""}`} title={providerName}>
        {live ? "● live" : "○ connecting"}
      </span>
      <span className="status-item" title={providerName}>
        {providerName.split(" ")[0]}
      </span>
      <span className="status-item">{hazardCount} active report{hazardCount === 1 ? "" : "s"}</span>
      <span className="status-item">{conditions.night ? "🌙 night" : "☀️ day"}</span>
      <span className="status-item">{conditions.raining ? "🌧️ rain" : "no rain"}</span>
      <span className="status-item muted" title="Static map context source">
        ctx: {tileSource}
      </span>
      {conditions.sourceWarning && (
        <span className="status-item warn-small" title={conditions.sourceWarning}>
          ⚠ weather
        </span>
      )}
    </div>
  );
}