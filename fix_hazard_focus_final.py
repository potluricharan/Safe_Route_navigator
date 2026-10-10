# -*- coding: utf-8 -*-
import io
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''<div className="hazard-focus">
                <span>
                  {HAZARD_TYPE_RULES[focusedHazard.type].icon}{" "}
                  {HAZARD_TYPE_RULES[focusedHazard.type].shortLabel} —{" "}
                  {focusedHazard.severity}, reported{" "}
                  {formatAge((hazards.now - focusedHazard.createdAt) / 3600_000)}{" "}
                  {focusedHazard.isDemoData ? "· demo data" : ""}
                </span>
                <span className="muted small">'''

replacement = '''<div className="hazard-focus">
                <span>
                  {HAZARD_TYPE_RULES[focusedHazard.type].icon}{" "}
                  {HAZARD_TYPE_RULES[focusedHazard.type].shortLabel} —{" "}
                  {focusedHazard.severity}, reported{" "}
                  {formatAge((hazards.now - focusedHazard.createdAt) / 3600_000)}{" "}
                  {focusedHazard.isDemoData ? "· demo data" : ""}
                </span>
                {focusedHazard.note && (
                  <div style={{ padding: '4px 0', color: '#cbd5e1', fontSize: '14px', fontStyle: 'italic', fontWeight: 500 }}>
                    "{focusedHazard.note}"
                  </div>
                )}
                <span className="muted small">'''

text = text.replace(target, replacement)
with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
