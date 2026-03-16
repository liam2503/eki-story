import { db } from './firebase.js';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

// Fetch only names/IDs for search index (lightweight)
async function syncSearchIndex() {
    const cached = localStorage.getItem('searchIndex');
    if (cached) return JSON.parse(cached);

    const [stationSnap, lineSnap] = await Promise.all([
        getDocs(collection(db, 'stations')),
        getDocs(collection(db, 'lines'))
    ]);

    const stations = [];
    stationSnap.forEach(docSnap => {
        const d = docSnap.data();
        stations.push({
            id: docSnap.id,
            station_id: d.station_id,
            station_g_id: d.station_g_id,
            station_name_en: d.station_name_en,
            station_name_jp: d.station_name_jp,
            line_id: d.line_id
        });
    });

    const lines = {};
    lineSnap.forEach(docSnap => {
        const d = docSnap.data();
        const colorValue = d.color || d.line_color_c || d.line_color;
        lines[docSnap.id] = {
            name_en: d.line_name_en || `Line ${docSnap.id}`,
            color: colorValue
                ? (String(colorValue).startsWith('#') ? String(colorValue) : '#' + colorValue)
                : '#000000'
        };
    });

    const index = { stations, lines };
    localStorage.setItem('searchIndex', JSON.stringify(index));
    return index;
}

function initButtons() {
    const feedBtn = document.getElementById("icon-shell-0");
    const heartBtn = document.getElementById("icon-shell-1");
    const listBtn = document.getElementById("icon-shell-2");
    const userBtn = document.getElementById("user-shell");

    const feedContainer = document.getElementById("feed-container");
    const listContainer = document.getElementById("list-container");
    const profileContainer = document.getElementById("profile-container");
    const topBar = document.getElementById("top-bar");
    const refreshBtnEl = document.getElementById("refresh-db");

    if (!feedBtn || !listBtn) return;

    function showTopBar() {
        if (topBar) topBar.classList.remove('hidden');
        if (refreshBtnEl) refreshBtnEl.classList.remove('hidden');
    }

    function hideTopBar() {
        if (topBar) topBar.classList.add('hidden');
        if (refreshBtnEl) refreshBtnEl.classList.add('hidden');
    }

    function resetUI() {
        feedContainer.classList.add("-translate-x-full");
        feedContainer.classList.add("pointer-events-none");
        listContainer.classList.add("translate-x-full");
        listContainer.classList.add("pointer-events-none");
        if (profileContainer) {
            profileContainer.classList.add("translate-x-full");
            profileContainer.classList.add("pointer-events-none");
        }
        showTopBar();

        const feedIcon = feedBtn.querySelector("svg");
        feedBtn.classList.remove("bg-[#FF80AB]");
        feedIcon.classList.remove("text-white");
        feedIcon.classList.add("text-[#FF80AB]");

        const listIcon = listBtn.querySelector("svg");
        listBtn.classList.remove("bg-[#40C4FF]");
        listIcon.classList.remove("text-white");
        listIcon.classList.add("text-[#40C4FF]");
    }

    window.resetUI = resetUI;

    feedBtn.onclick = function() {
        const isOpen = !feedContainer.classList.contains("-translate-x-full");
        resetUI();
        if (!isOpen) {
            feedContainer.classList.remove("-translate-x-full");
            feedContainer.classList.remove("pointer-events-none");
            feedBtn.classList.add("bg-[#FF80AB]");
            feedBtn.querySelector("svg").classList.add("text-white");
            hideTopBar();
        }
    };

    listBtn.onclick = function() {
        const isOpen = !listContainer.classList.contains("translate-x-full");
        resetUI();
        if (!isOpen) {
            listContainer.classList.remove("translate-x-full");
            listContainer.classList.remove("pointer-events-none");
            listBtn.classList.add("bg-[#40C4FF]");
            listBtn.querySelector("svg").classList.add("text-white");
            hideTopBar();
        }
    };

    if (heartBtn) {
        heartBtn.onclick = resetUI;
    }

    if (userBtn && profileContainer) {
        userBtn.onclick = function() {
            const isOpen = !profileContainer.classList.contains("translate-x-full");
            resetUI();
            if (!isOpen) {
                profileContainer.classList.remove("translate-x-full");
                profileContainer.classList.remove("pointer-events-none");
                hideTopBar();
            }
        };
    }

}

let searchInitialized = false;

async function initSearch() {
    if (searchInitialized) return;
    const searchInput = document.getElementById('station-search');
    const searchResults = document.getElementById('search-results');
    if (!searchInput || !searchResults) return;
    searchInitialized = true;

    const index = await syncSearchIndex();

    searchInput.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        if (!query) {
            searchResults.classList.add('hidden');
            searchResults.innerHTML = '';
            window.clearLineFilter?.();
            return;
        }

        const { stations, lines } = index;

        // Match lines by name
        const matchedLines = Object.entries(lines)
            .filter(([, d]) => (d.name_en || '').toLowerCase().includes(query))
            .slice(0, 5);

        // Match stations, group by station_g_id
        const stationGroups = {};
        stations.forEach(s => {
            const nameEn = (s.station_name_en || '').toLowerCase();
            const nameJp = (s.station_name_jp || '').toLowerCase();
            if (!nameEn.includes(query) && !nameJp.includes(query)) return;
            const gid = s.station_g_id || s.id;
            if (!stationGroups[gid]) {
                stationGroups[gid] = {
                    name: s.station_name_en || s.station_name_jp || 'Unknown',
                    stations: []
                };
            }
            stationGroups[gid].stations.push(s);
        });

        const stationEntries = Object.entries(stationGroups).slice(0, 15);

        if (matchedLines.length === 0 && stationEntries.length === 0) {
            searchResults.innerHTML = '<div class="px-5 py-4 text-xs font-black uppercase text-gray-400">No results</div>';
            searchResults.classList.remove('hidden');
            return;
        }

        let html = '';

        // Line results
        matchedLines.forEach(([lineId, lineData]) => {
            html += `
                <div class="search-result flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 border-b-[2px] border-black last:border-b-0"
                     data-type="line" data-id="${lineId}">
                    <div class="w-10 h-3 rounded-full border-[2px] border-black shrink-0" style="background-color:${lineData.color}"></div>
                    <span class="text-xs font-black uppercase">${lineData.name_en}</span>
                    <span class="ml-auto text-[10px] font-black uppercase text-gray-400">Line</span>
                </div>
            `;
        });

        // Station results
        stationEntries.forEach(([, group]) => {
            if (group.stations.length === 1) {
                const s = group.stations[0];
                const line = lines[String(s.line_id)];
                html += `
                    <div class="search-result flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 border-b-[2px] border-black last:border-b-0"
                         data-type="station" data-id="${s.station_id || s.id}">
                        <div class="w-4 h-4 rounded-full border-[3px] border-black shrink-0 bg-white" style="border-color:${line?.color || '#000'}"></div>
                        <span class="text-xs font-black uppercase">${group.name}</span>
                        <span class="ml-auto text-[10px] font-black uppercase text-gray-400">${line?.name_en || ''}</span>
                    </div>
                `;
            } else {
                // Multi-line station: show color dots + sub-rows per line
                const colorDots = group.stations.slice(0, 4).map(s => {
                    const line = lines[String(s.line_id)];
                    return `<div class="w-3 h-3 rounded-full border-[2px] border-black shrink-0" style="background-color:${line?.color || '#000'}"></div>`;
                }).join('');

                const subItems = group.stations.map(s => {
                    const line = lines[String(s.line_id)];
                    return `
                        <div class="search-result flex items-center gap-2 px-5 py-2 cursor-pointer hover:bg-gray-50"
                             data-type="station" data-id="${s.station_id || s.id}">
                            <div class="w-3 h-3 rounded-full border-[2px] border-black shrink-0" style="background-color:${line?.color || '#000'}"></div>
                            <span class="text-[10px] font-black uppercase">${line?.name_en || `Line ${s.line_id}`}</span>
                        </div>
                    `;
                }).join('');

                html += `
                    <div class="border-b-[2px] border-black last:border-b-0">
                        <div class="multi-station-header flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50">
                            <div class="flex gap-1">${colorDots}</div>
                            <span class="text-xs font-black uppercase">${group.name}</span>
                            <span class="ml-auto text-[10px] font-black uppercase text-gray-400">${group.stations.length} Lines</span>
                            <svg class="multi-chevron w-4 h-4 shrink-0 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M6 9l6 6 6-6"/>
                            </svg>
                        </div>
                        <div class="multi-station-sub hidden border-t-[2px] border-black/20">${subItems}</div>
                    </div>
                `;
            }
        });

        searchResults.innerHTML = html;
        searchResults.classList.remove('hidden');

        // Click: fetch full data on selection
        searchResults.querySelectorAll('.search-result').forEach(item => {
            item.addEventListener('click', async () => {
                const type = item.dataset.type;
                const id = item.dataset.id;
                searchResults.classList.add('hidden');
                searchInput.value = '';

                if (type === 'station') {
                    const cached = window.allStations?.find(s => String(s.station_id || s.id) === String(id));
                    if (cached) {
                        window.filterToLine?.(cached.line_id);
                        if (window.map) window.map.panTo({ lat: Number(cached.lat), lng: Number(cached.lon) });
                        return;
                    }
                    // Fetch full station data if not cached
                    const snap = await getDoc(doc(db, 'stations', id));
                    if (snap.exists()) {
                        const d = snap.data();
                        window.filterToLine?.(d.line_id);
                        if (window.map) window.map.panTo({ lat: Number(d.lat), lng: Number(d.lon) });
                    }
                } else if (type === 'line') {
                    window.filterToLine?.(id);
                    const lineStations = window.allStations?.filter(s => String(s.line_id) === String(id));
                    if (lineStations?.length && window.map) {
                        const mid = lineStations[Math.floor(lineStations.length / 2)];
                        window.map.panTo({ lat: Number(mid.lat), lng: Number(mid.lon) });
                    }
                }
            });
        });

        // Toggle multi-line station sub-items
        searchResults.querySelectorAll('.multi-station-header').forEach(header => {
            header.addEventListener('click', () => {
                const sub = header.nextElementSibling;
                const chevron = header.querySelector('.multi-chevron');
                sub.classList.toggle('hidden');
                chevron.classList.toggle('rotate-180');
            });
        });
    });

    // Prevent iOS bounce/overscroll inside the dropdown
    let touchStartY = 0;
    searchResults.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    searchResults.addEventListener('touchmove', (e) => {
        const el = searchResults;
        const delta = e.touches[0].clientY - touchStartY;
        const atTop = el.scrollTop === 0;
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight;
        if ((atTop && delta > 0) || (atBottom && delta < 0)) {
            e.preventDefault();
        }
    }, { passive: false });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });
}

const refreshBtn = document.getElementById("refresh-db");
if (refreshBtn) {
    refreshBtn.onclick = () => {
        localStorage.clear();
        window.location.reload();
    };
}

document.addEventListener("DOMContentLoaded", () => { initButtons(); initSearch(); });
document.addEventListener("turbo:load", () => { initButtons(); initSearch(); });
document.addEventListener("turbo:frame-load", initButtons);
