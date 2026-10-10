import io, re
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''            <SearchBar
              start={start}
              destination={destination}
              onSet={setPoint}
              onSwap={() => {
                setStart(destination);
                setDestination(start);
              }}
              onPickWithMap={(w) => {
                setPickMode(pickMode === w ? null : w);
                setPanel("routes");
              }}
              pickMode={pickMode}
            />'''

replacement = '''            <SearchBar
              start={start}
              startLabel={startLabel}
              destination={destination}
              destLabel={destLabel}
              onSet={setPoint}
              onSwap={() => {
                const s = start;
                const sl = startLabel;
                setStart(destination);
                setStartLabel(destLabel);
                setDestination(s);
                setDestLabel(sl);
              }}
              onPickWithMap={(w) => {
                setPickMode(pickMode === w ? null : w);
                setPanel("routes");
              }}
              pickMode={pickMode}
            />'''

text = text.replace(target, replacement)
with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
