import io
with io.open('src/components/ConfidenceBadge.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''const CONF_META: Record<
  ConfidenceLabel,
  { label: string; color: string; hint: string }
> = {
  high: { label: "High confidence", color: "#16a34a", hint: "Recent, confirmed reports." },
  medium: { label: "Medium confidence", color: "#ca8a04", hint: "Some active data, partly confirmed." },
  low: { label: "Low confidence", color: "#ea580c", hint: "Only unconfirmed or stale reports." },
  limited: {
    label: "Limited information",
    color: "#64748b",
    hint: "Little or no data on this route. No reports is not the same as safe."
  }
};'''

replacement = '''const CONF_META: Record<
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
};'''

text = text.replace(target, replacement)

with io.open('src/components/ConfidenceBadge.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
