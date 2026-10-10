import type { ConfidenceLabel } from "../types";

const CONF_META: Record<
  ConfidenceLabel,
  { label: string; color: string; hint: string }
> = {
  high: { label: "High confidence", color: "#16a34a", hint: "Path appears clear with active lighting coverage." },
  medium: { label: "Medium confidence", color: "#ca8a04", hint: "Path appears clear but lighting data is unknown." },
  low: { label: "Low confidence", color: "#ea580c", hint: "High-severity hazards detected. ETA and safety are unpredictable." },
  limited: {
    label: "Limited confidence",
    color: "#64748b",
    hint: "Minor hazards present. Treat estimates with caution."
  }
};

export default function ConfidenceBadge({
  level,
  inline = false
}: {
  level: ConfidenceLabel;
  inline?: boolean;
}) {
  const meta = CONF_META[level];
  return (
    <span
      className={`confidence-badge${inline ? " confidence-inline" : ""}`}
      style={{ "--conf": meta.color } as React.CSSProperties}
      title={meta.hint}
    >
      {meta.label}
    </span>
  );
}

export function confidenceHint(level: ConfidenceLabel): string {
  return CONF_META[level].hint;
}