import io
with io.open('src/styles.css', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''.hazard-marker span {
  display: grid;
  place-items: center;
}'''

replacement = '''.hazard-marker span {
  width: 34px;
  height: 34px;
  background: var(--bg);
  border: 3px solid #fff;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 18px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.6);
}
.hazard-marker span.hm-high { border-color: var(--red); }
.hazard-marker span.hm-medium { border-color: var(--amber); }
.hazard-marker span.hm-low { border-color: var(--green); }'''

text = text.replace(target, replacement)

with io.open('src/styles.css', 'w', encoding='utf-8') as f:
    f.write(text)
