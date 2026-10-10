import io, re
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''  const setPoint = (which: WhichPoint, p: LatLngPair, label?: string) => {
    if (which === "start") {
      setStart(p);
      if (label) setStartLabel(label.split(",")[0]);
    } else {
      setDestination(p);
      if (label) setDestLabel(label.split(",")[0]);
    }
    setPickMode(null);
  };'''

replacement = '''  const setPoint = (which: WhichPoint, p: LatLngPair, label?: string) => {
    if (which === "start") {
      setStart(p);
      setStartLabel(label ? label.split(",")[0] : "Selected on Map");
    } else {
      setDestination(p);
      setDestLabel(label ? label.split(",")[0] : "Selected on Map");
    }
    setPickMode(null);
  };'''

text = text.replace(target, replacement)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
