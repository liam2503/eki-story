import { useState, useMemo } from "react";
import { toHiragana, toKatakana, isRomaji } from "wanakana";
import { useLines } from "../../hooks/useStations";

export default function LineSearchBar({ selectedLine, onSelect }) {
  const { lines, loading } = useLines();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    // If romaji input, also convert to hiragana/katakana for Japanese matching
    const qHira = isRomaji(query) ? toHiragana(query) : "";
    const qKata = isRomaji(query) ? toKatakana(query) : "";
    return lines
      .filter((l) => {
        const name = l.line_name?.toLowerCase() ?? "";
        const nameEn = l.line_name_en?.toLowerCase() ?? "";
        const nameK = l.line_name_k?.toLowerCase() ?? "";
        return (
          name.includes(q) ||
          nameEn.includes(q) ||
          nameK.includes(q) ||
          (qHira && name.includes(qHira)) ||
          (qKata && nameK.includes(qKata))
        );
      })
      .slice(0, 8);
  }, [query, lines]);

  function handleSelect(line) {
    onSelect(line);
    setQuery(line.line_name_en || line.line_name);
    setOpen(false);
  }

  function handleClear() {
    onSelect(null);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[85%] max-w-sm z-20">
      <div className="relative">
        <div className="flex items-center bg-white border-2 border-black rounded-full shadow px-4 py-2 space-x-2">
          {/* Line color dot */}
          {selectedLine && (
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: selectedLine.line_color_c ? `#${selectedLine.line_color_c}` : "#009B73" }}
            />
          )}
          {!selectedLine && (
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          )}
          <input
            type="text"
            placeholder={loading ? "Loading lines..." : "Search for a line..."}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className="flex-1 text-sm bg-transparent outline-none"
          />
          {(query || selectedLine) && (
            <button onClick={handleClear} className="text-gray-400 hover:text-black text-lg leading-none">×</button>
          )}
        </div>

        {/* Dropdown */}
        {open && filtered.length > 0 && (
          <div className="absolute top-full mt-1 w-full bg-white border-2 border-black rounded-2xl shadow-lg overflow-hidden">
            {filtered.map((line) => (
              <button
                key={line.id}
                onClick={() => handleSelect(line)}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition border-b border-gray-100 last:border-0"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: line.line_color_c ? `#${line.line_color_c}` : "#009B73" }}
                />
                <div>
                  <p className="text-sm font-bold">{line.line_name_en || line.line_name}</p>
                  <p className="text-xs text-gray-400">{line.line_name} · {line.total_stations} stations</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
