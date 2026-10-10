import io
with io.open('src/styles.css', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''.hazard-marker span {
  width: 34px;
  height: 34px;
  background: var(--bg);
  border: 3px solid #fff;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 18px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.6);
}'''

replacement = '''.hazard-marker span {
  width: 34px !important;
  height: 34px !important;
  background: var(--bg2) !important;
  border: 3px solid #fff !important;
  border-radius: 50% !important;
  display: grid !important;
  place-items: center !important;
  font-size: 18px !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.6) !important;
  z-index: 9999 !important;
}'''

text = text.replace(target, replacement)

with io.open('src/styles.css', 'w', encoding='utf-8') as f:
    f.write(text)
