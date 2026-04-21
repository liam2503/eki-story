import { state, selectors, RENDER_CHUNK_SIZE } from "./list_state.js";
import { showLineDetail } from "./list_detail.js";
import { isVisited, userStamps, userModels } from "./user.js";
import { idbGet } from "./idb.js";
import { getLanguage } from "./i18n.js";
import { playOkSound } from "./audio.js";

export async function renderLines() {
  state.localStations =
    window.allStations || (await idbGet("stationData")) || [];
  state.localLines =
    window.lineData || window.lineColors || (await idbGet("lineData")) || {};

  if (selectors.sentinel.parentNode) {
    state.observer.unobserve(selectors.sentinel);
  }

  selectors.linesContainer.innerHTML = "";
  state.renderIndex = 0;

  let targetLineIds = Object.keys(state.localLines);

  if (!state.currentPrefId && !state.currentCompId) {
    targetLineIds = targetLineIds.filter((id) => {
      const stationsOnLine = state.localStations.filter(
        (s) => String(s.line_id) === String(id),
      );
      const hasVisitedStation = stationsOnLine.some(
        (s) => isVisited(s.id) || userStamps[String(s.id)],
      );
      const hasModel = Object.values(userModels || {}).some(
        (m) => String(m.line_id) === String(id),
      );

      return hasVisitedStation || hasModel;
    });
  } else {
    if (state.currentPrefId) {
      const prefLineIds = new Set(
        state.localStations
          .filter(
            (s) =>
              String(s.pref_cd || s.pref_id) === String(state.currentPrefId),
          )
          .map((s) => String(s.line_id)),
      );
      targetLineIds = targetLineIds.filter((id) => prefLineIds.has(id));
    }
    if (state.currentCompId) {
      targetLineIds = targetLineIds.filter((id) => {
        const line = state.localLines[id];
        return (
          line &&
          String(line.company_id || line.company_cd) ===
            String(state.currentCompId)
        );
      });
    }
  }

  state.currentFilteredLines = targetLineIds;
  renderNextChunk();
}

export function renderNextChunk() {
  const chunk = state.currentFilteredLines.slice(
    state.renderIndex,
    state.renderIndex + RENDER_CHUNK_SIZE,
  );
  if (chunk.length === 0) return;

  if (selectors.sentinel.parentNode) {
    state.observer.unobserve(selectors.sentinel);
    selectors.sentinel.remove();
  }

  const lang = getLanguage();

  chunk.forEach((lineId) => {
    const line = state.localLines[lineId];
    const stationsOnLine = state.localStations.filter(
      (s) => String(s.line_id) === String(lineId),
    );
    if (stationsOnLine.length === 0) return;

    const total = line.total_stations || stationsOnLine.length;
    const visited = stationsOnLine.filter(
      (s) => isVisited(s.id) || userStamps[String(s.id)],
    ).length;
    const lineName =
      lang === "ja"
        ? line.name_jp || line.name_en
        : line.name_en || line.name_jp;

    const card = document.createElement("div");
    card.id = `line-card-${lineId}`;
    card.className =
      "bg-white border-[3px] border-black p-4 rounded-[20px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3 transition-all cursor-pointer hover:translate-x-1 hover:translate-y-1 hover:shadow-none";

    const segments = Array.from({ length: total })
      .map(
        (_, i) =>
          `<div class="flex-1 h-full rounded-sm ${i < visited ? "bg-[#B2FF59]" : "bg-gray-200"}"></div>`,
      )
      .join("");

    card.innerHTML = `
            <div class="flex items-center justify-between gap-3 pointer-events-none">
                <h3 class="text-black font-black text-lg leading-tight  tracking-tight break-words flex-1">${lineName}</h3>
                <div class="w-14 h-14 shrink-0 bg-white border-[3px] border-black rounded-full flex items-center justify-center text-black font-black italic" style="box-shadow: 3px 3px 0px 0px ${line.color || "#000"}">
                    <div class="flex items-baseline mt-0.5">
                        <span class="text-xl leading-none">${visited}</span>
                        <span class="mx-0.5 opacity-40 text-sm leading-none">/</span>
                        <span class="text-xs opacity-60 leading-none">${total}</span>
                    </div>
                </div>
            </div>
            <div class="w-full flex gap-1 h-2 mt-1 pointer-events-none">${segments}</div>
        `;

    card.onclick = () => {
      playOkSound();
      showLineDetail(lineId);
    };
    selectors.linesContainer.appendChild(card);
  });

  state.renderIndex += RENDER_CHUNK_SIZE;
  if (state.renderIndex < state.currentFilteredLines.length) {
    selectors.linesContainer.appendChild(selectors.sentinel);
    state.observer.observe(selectors.sentinel);
  }
}
