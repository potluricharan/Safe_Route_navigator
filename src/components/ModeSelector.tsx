import type { RouteMode } from "../types";
import { MODE_LABELS, MODE_DESCRIPTIONS } from "../config/app";

const ORDER: RouteMode[] = ["fastest", "balanced", "lowerRisk"];

export default function ModeSelector({
  mode,
  onChange
}: {
  mode: RouteMode;
  onChange: (m: RouteMode) => void;
}) {
  return (
    <div className="mode-selector" role="tablist" aria-label="Routing preference">
      {ORDER.map((m) => (
        <button
          key={m}
          role="tab"
          aria-selected={mode === m}
          className={`mode-option${mode === m ? " mode-active" : ""}`}
          onClick={() => onChange(m)}
          title={MODE_DESCRIPTIONS[m]}
        >
          {MODE_LABELS[m]}
        </button>
      ))}
    </div>
  );
}

export function ModeDescription({ mode }: { mode: RouteMode }) {
  return <p className="mode-description">{MODE_DESCRIPTIONS[mode]}</p>;
}