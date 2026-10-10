import { useEffect, useRef, useState } from "react";
import type { GeocodeResult } from "../services/geocoder";
import { geocode, geocodeLocal } from "../services/geocoder";
import { CAMPUS } from "../config/app";
import type { LatLngPair } from "./MapView";

export type WhichPoint = "start" | "destination";

interface SearchBarProps {
  start: LatLngPair | null;
  startLabel: string;
  destination: LatLngPair | null;
  destLabel: string;
  onSet: (which: WhichPoint, point: LatLngPair, label?: string) => void;
  onSwap: () => void;
  onPickWithMap: (which: WhichPoint) => void;
  pickMode: WhichPoint | null;
}

export default function SearchBar(props: SearchBarProps) {
  const dirty = useRef<{ start?: string; destination?: string }>({});
  const [suggestions, setSuggestions] = useState<{
    which: WhichPoint;
    items: GeocodeResult[];
  } | null>(null);
  const [query, setQuery] = useState<{ start: string; destination: string }>({
    start: "",
    destination: ""
  });

  const runGeocode = async (which: WhichPoint, q: string) => {
    if (q.trim().length < 2) {
      setSuggestions(null);
      return;
    }
    const near: [number, number] = which === "start"
      ? (props.destination ?? [CAMPUS.center[0], CAMPUS.center[1]])
      : (props.start ?? [CAMPUS.center[0], CAMPUS.center[1]]);
    const remote = await geocode(q, { near }).catch(() => []);
    const local = geocodeLocal(q, [...CAMPUS.landmarks]);
    const merged = [...local, ...remote].slice(0, 6);
    setSuggestions({ which, items: merged });
  };

  useEffect(() => {
    if (props.startLabel) {
      setQuery((q) => ({ ...q, start: props.startLabel }));
    }
  }, [props.startLabel]);

  useEffect(() => {
    if (props.destLabel) {
      setQuery((q) => ({ ...q, destination: props.destLabel }));
    }
  }, [props.destLabel]);

  const debounce = useRef<number | null>(null);
  const onChange = (which: WhichPoint, value: string) => {
    dirty.current[which] = value;
    setQuery((q) => ({ ...q, [which]: value }));
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => runGeocode(which, value), 350);
  };

  return (
    <div className="searchbar">
      <PointInput
        which="start"
        icon="🟢"
        placeholder="Start (e.g. Benz Circle, Gate 2)"
        value={query.start}
        onChange={onChange}
        onFocus={() => setSuggestions(null)}
        onPickMap={() => props.onPickWithMap("start")}
        activePick={props.pickMode === "start"}
      />
      <button className="swap-btn" title="Swap start and destination" onClick={props.onSwap}>
        ⇅
      </button>
      <PointInput
        which="destination"
        icon="🏁"
        placeholder="Destination (e.g. Bus Stand, MG Road)"
        value={query.destination}
        delimiter
        onChange={onChange}
        onFocus={() => setSuggestions(null)}
        onPickMap={() => props.onPickWithMap("destination")}
        activePick={props.pickMode === "destination"}
      />
      {suggestions && (
        <ul className="suggestions">
          {suggestions.items.map((s, i) => (
            <li key={i}>
              <button
                onClick={() => {
                  props.onSet(suggestions.which, [s.lat, s.lng], s.label);
                  dirty.current[suggestions.which] = "";
                  setQuery((q) => ({ ...q, [suggestions.which]: s.label }));
                  setSuggestions(null);
                }}
              >
                <span className="sug-kind">{s.kind === "landmark" ? "📍" : "🏷️"}</span>
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PointInput(props: {
  which: WhichPoint;
  icon: string;
  placeholder: string;
  value: string;
  delimiter?: boolean;
  onChange: (which: WhichPoint, value: string) => void;
  onFocus: () => void;
  onPickMap: () => void;
  activePick: boolean;
}) {
  return (
    <div className={`point-input${props.delimiter ? " point-input-gap" : ""}`}>
      <span className="pi-icon">{props.icon}</span>
      <input
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(props.which, e.target.value)}
        onFocus={props.onFocus}
      />
      <button
        className={`pick-map-btn${props.activePick ? " pick-map-active" : ""}`}
        onClick={props.onPickMap}
        title="Place by tapping the map"
      >
        🎯
      </button>
    </div>
  );
}