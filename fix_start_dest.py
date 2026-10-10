import io, re
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(
    r'const \[start, setStart\] = useState<LatLngPair \| null>\(\[\s*CAMPUS\.center\[0\],\s*CAMPUS\.center\[1\]\s*\]\);',
    'const [start, setStart] = useState<LatLngPair | null>(null);', text)

text = re.sub(
    r'const \[destination, setDestination\] = useState<LatLngPair \| null>\(\[\s*16\.5206,\s*80\.6191\s*\]\);',
    'const [destination, setDestination] = useState<LatLngPair | null>(null);', text)

text = re.sub(
    r'const \[startLabel, setStartLabel\] = useState\("Benz Circle"\);',
    'const [startLabel, setStartLabel] = useState("");', text)

text = re.sub(
    r'const \[destLabel, setDestLabel\] = useState\("Pandit Nehru Bus Stand"\);',
    'const [destLabel, setDestLabel] = useState("");', text)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
