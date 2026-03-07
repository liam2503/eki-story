import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toHiragana, toKatakana, isRomaji } from "wanakana";
import TopBar from "../components/layout/TopBar";
import BottomNav from "../components/layout/BottomNav";
import { useLines } from "../hooks/useStations";
import { useVisits } from "../hooks/useVisits";

export default function Lines() {
  const navigate = useNavigate();
  const { lines, loading } = useLines();
  const { visits } = useVisits();
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);

  function visitedCount(line) {
    return visits.filter((v) => v.line_cd === line.line_cd).length;
  }

  function completionRate(line) {
    if (!line.total_stations) return 0;
    return Math.round((visitedCount(line) / line.total_stations) * 100);
  }

  const filtered = useMemo(() => {
    return lines.filter((l) => {
      if (!l.total_stations || l.total_stations === 0) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      const qHira = isRomaji(search) ? toHiragana(search) : "";
      const qKata = isRomaji(search) ? toKatakana(search) : "";
      const name = l.line_name?.toLowerCase() ?? "";
      const nameEn = l.line_name_en?.toLowerCase() ?? "";
      const nameK = l.line_name_k?.toLowerCase() ?? "";
      return (
        name.includes(q) || nameEn.includes(q) || nameK.includes(q) ||
        (qHira && name.includes(qHira)) ||
        (qKata && nameK.includes(qKata))
      );
    });
  }, [search, lines]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((line) => {
      const key = line.company_cd || "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(line);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="relative w-full h-screen bg-gray-100 overflow-hidden">
      <TopBar streak={0} alerts={0} />

      <div className="absolute inset-0 overflow-y-auto pt-20 pb-28">
        <div className="px-4 pt-4 pb-2 max-w-sm mx-auto">
          <div className="flex items-center bg-white border-2 border-black rounded-full px-4 py-2 shadow space-x-2">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search lines..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-sm bg-transparent outline-none"
            />
            {search && <button onClick={() => setSearch("")} className="text-gray-400 hover:text-black">×</button>}
          </div>
        </div>

        {loading && <p className="text-center text-gray-400 text-sm pt-10">Loading...</p>}

        <div className="max-w-sm mx-auto px-4 space-y-6 pt-2">
          {grouped.map(([company_cd, companyLines]) => (
            <div key={company_cd}>
              <p className="text-xs text-gray-400 uppercase font-bold mb-2 px-1">{company_cd}</p>
              <div className="space-y-2">
                {companyLines.map((line) => {
                  const visited = visitedCount(line);
                  const rate = completionRate(line);
                  const color = line.line_color_c ? `#${line.line_color_c}` : "#009B73";
                  const isOpen = openId === line.id;

                  return (
                    <div key={line.id} className="eki-card cursor-pointer" onClick={() => setOpenId(isOpen ? null : line.id)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-bold text-sm truncate">{line.line_name}</span>
                        </div>
                        <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                          {rate > 0 && (
                            <span className="text-xs font-black" style={{ color }}>{rate}%</span>
                          )}
                          <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Progress bar - always visible */}
                      {rate > 0 && (
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                          <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${rate}%`, backgroundColor: color }} />
                        </div>
                      )}

                      {/* Expanded detail */}
                      {isOpen && (
                        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                          <div className="bg-gray-50 rounded-xl p-3 text-center">
                            <p className="text-xl font-black" style={{ color }}>{visited}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold mt-0.5">Visited</p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-3 text-center">
                            <p className="text-xl font-black text-gray-400">{line.total_stations - visited}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold mt-0.5">Remaining</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav activeTab="list" onTabChange={(tab) => navigate(tab === "map" ? "/" : `/${tab}`)} />
    </div>
  );
}
