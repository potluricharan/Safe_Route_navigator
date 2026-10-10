import io, re
with io.open('src/hooks/useGeolocation.ts', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          status: "granted",
          position: [pos.coords.latitude, pos.coords.longitude],
          accuracyM: pos.coords.accuracy,
          error: null
        });
      },
      (err) => {
        setState({
          status: err.code === err.PERMISSION_DENIED ? "denied" : "error",
          position: null,
          accuracyM: null,
          error: err.message
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 }
    );'''

replacement = '''    navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          status: "granted",
          position: [pos.coords.latitude, pos.coords.longitude],
          accuracyM: pos.coords.accuracy,
          error: null
        });
      },
      (err) => {
        setState({
          status: err.code === err.PERMISSION_DENIED ? "denied" : "error",
          position: null,
          accuracyM: null,
          error: err.message
        });
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 5000 }
    );'''

text = text.replace(target, replacement)
with io.open('src/hooks/useGeolocation.ts', 'w', encoding='utf-8') as f:
    f.write(text)
