import io, re
with io.open('src/components/SearchBar.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target1 = '''interface SearchBarProps {
  start: LatLngPair | null;
  destination: LatLngPair | null;
  onSet: (which: WhichPoint, point: LatLngPair, label?: string) => void;
  onSwap: () => void;
  onPickWithMap: (which: WhichPoint) => void;
  pickMode: WhichPoint | null;
}'''

replacement1 = '''interface SearchBarProps {
  start: LatLngPair | null;
  startLabel: string;
  destination: LatLngPair | null;
  destLabel: string;
  onSet: (which: WhichPoint, point: LatLngPair, label?: string) => void;
  onSwap: () => void;
  onPickWithMap: (which: WhichPoint) => void;
  pickMode: WhichPoint | null;
}'''
text = text.replace(target1, replacement1)

target2 = '''  useEffect(() => {
    if (!props.start) return;
    dirty.current.start = "";
    setQuery((q) => ({ ...q, start: "" }));
  }, [props.start?.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!props.destination) return;
    dirty.current.destination = "";
    setQuery((q) => ({ ...q, destination: "" }));
  }, [props.destination?.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps'''

replacement2 = '''  useEffect(() => {
    if (props.startLabel) {
      setQuery((q) => ({ ...q, start: props.startLabel }));
    }
  }, [props.startLabel]);

  useEffect(() => {
    if (props.destLabel) {
      setQuery((q) => ({ ...q, destination: props.destLabel }));
    }
  }, [props.destLabel]);'''
text = text.replace(target2, replacement2)

# Fix garbled text in SearchBar while I'm at it
text = re.sub(r'\"dYY.*?\"', '\"\U0001F7E2\"', text) # green circle
text = re.sub(r'\"dY\?\?\"', '\"\U0001F3C1\"', text) # flag
text = re.sub(r'\"\.\"', '\"\U0001F504\"', text) # swap arrows
text = re.sub(r'\"dYZ_\"', '\"\U0001F3AF\"', text) # target/darts
text = re.sub(r'\"dY\"\?\"', '\"\U0001F3DB\uFE0F\"', text) # landmark
text = re.sub(r'\"dY\?,\?\"', '\"\U0001F4CD\"', text) # pin

with io.open('src/components/SearchBar.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
