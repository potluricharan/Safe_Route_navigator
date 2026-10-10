import io, re
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''                <div className="hazard-focus">
                <span>
                  {HAZARD_TYPE_RULES[focusedHazard.type].icon}{" "}
                  {HAZARD_TYPE_RULES[focusedHazard.type].shortLabel} &mdash;{" "}
                  {focusedHazard.severity}, reported{" "}
                  {formatAge((hazards.now - focusedHazard.createdAt) / 3600_000)}{" "}
                  {focusedHazard.isDemoData ? "· demo data" : ""}
                </span>'''

replacement = '''                <div className="hazard-focus">
                <span>
                  {HAZARD_TYPE_RULES[focusedHazard.type].icon}{" "}
                  {HAZARD_TYPE_RULES[focusedHazard.type].shortLabel} &mdash;{" "}
                  {focusedHazard.severity}, reported{" "}
                  {formatAge((hazards.now - focusedHazard.createdAt) / 3600_000)}{" "}
                  {focusedHazard.isDemoData ? "· demo data" : ""}
                </span>
                {focusedHazard.note && (
                  <div style={{ padding: '8px 0', color: '#e2e8f0', fontSize: '14px', fontStyle: 'italic' }}>
                    "{focusedHazard.note}"
                  </div>
                )}'''

text = re.sub(r'                <div className="hazard-focus">\s+<span>\s+\{HAZARD_TYPE_RULES\[focusedHazard\.type\]\.icon\}\{" "\}\s+\{HAZARD_TYPE_RULES\[focusedHazard\.type\]\.shortLabel\} .*?\{" "\}\s+\{focusedHazard\.severity\}, reported\{" "\}\s+\{formatAge\(\(hazards\.now - focusedHazard\.createdAt\) / 3600_000\)\}\{" "\}\s+\{focusedHazard\.isDemoData \? ".*? demo data" : ""\}\s+</span>', replacement, text)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
