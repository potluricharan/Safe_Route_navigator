import io
with io.open('src/services/scoring.ts', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''export function confidenceLabel(
  hazardFactors: HazardFactor[],
  _exposure: number,
  lightingCoverage: "available" | "unknown"
): ConfidenceLabel {
  if (hazardFactors.length === 0) {
    return lightingCoverage === "available" ? "medium" : "limited";
  }
  const strong = hazardFactors.filter(
    (f) => f.confidence >= 0.6 && f.freshness >= 0.5
  ).length;
  if (strong > 0) return "high";
  const moderate = hazardFactors.filter((f) => f.confidence >= 0.4).length;
  if (moderate > 0) return "medium";
  return "low";
}'''

replacement = '''export function confidenceLabel(
  hazardFactors: HazardFactor[],
  _exposure: number,
  lightingCoverage: "available" | "unknown"
): ConfidenceLabel {
  // If there are hazards on the route, our confidence in the route's safety and ETA decreases
  if (hazardFactors.length > 0) {
    const hasHighSeverity = hazardFactors.some((f) => f.severity === "high");
    return hasHighSeverity ? "low" : "limited";
  }
  
  // If no hazards are reported on the route, confidence is high (or medium if lighting is unknown)
  return lightingCoverage === "available" ? "high" : "medium";
}'''

text = text.replace(target, replacement)

with io.open('src/services/scoring.ts', 'w', encoding='utf-8') as f:
    f.write(text)
