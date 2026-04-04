import { state, selectors } from './list_state.js';
import { renderLines } from './list_render.js';
import { showLineDetail } from './list_detail.js';
import { getLanguage, t } from './i18n.js';

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function populatePrefectures() {
    const lang = getLanguage();
    const allPrefs = t('list.allPrefectures');
    
    let html = `<div class="pref-option flex items-center px-6 py-4 cursor-pointer hover:bg-gray-50 border-b-[2px] border-black last:border-b-0" data-value="">
                    <span class="text-base font-black uppercase">${allPrefs}</span>
                </div>`;
    state.prefectures.forEach(p => {
        const id = p.pref_id || p.id;
        const name = lang === 'ja' ? (p.pref_name_jp || p.name_jp || p.pref_name_en || p.name_en) : (p.pref_name_en || p.name_en);
        html += `<div class="pref-option flex items-center px-6 py-4 cursor-pointer hover:bg-gray-50 border-b-[2px] border-black last:border-b-0" data-value="${id}" data-name="${name}">
                    <span class="text-base font-black uppercase">${name}</span>
                </div>`;
    });
    selectors.prefMenu.innerHTML = html;
    selectors.prefMenu.querySelectorAll('.pref-option').forEach(item => {
        item.onclick = (e) => {
            e.stopPropagation();
            state.currentPrefId = item.dataset.value;
            selectors.prefSelectedText.textContent = item.dataset.name || allPrefs;
            selectors.prefMenu.classList.add('hidden');
            state.currentCompId = "";
            selectors.compSelectedText.textContent = t('list.allCompanies');
            updateCompanyDropdown();
            renderLines();
        };
    });
}


export function populateCompanies(filteredCompanies = state.companies) {
    const lang = getLanguage();
    const allComps = t('list.allCompanies');
    
    let html = `<div class="comp-option flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 border-b-[2px] border-black last:border-b-0" data-value="">
                    <div class="w-10 h-10 shrink-0"></div>
                    <span class="text-base font-black uppercase">${allComps}</span>
                </div>`;
    filteredCompanies.forEach(c => {
        const id = c.company_id || c.id;
        const name = lang === 'ja' ? (c.company_name_jp || c.name_jp || c.company_name_en || c.name_en) : (c.company_name_en || c.name_en || c.company_name_jp);
        
        const logoHtml = c.logo_url 
            ? `<img src="${c.logo_url}" class="w-10 h-10 object-contain shrink-0" />`
            : `<div class="w-10 h-10 shrink-0"></div>`;

        html += `<div class="comp-option flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 border-b-[2px] border-black last:border-b-0" data-value="${id}" data-name="${name}">
                    ${logoHtml}
                    <span class="text-base font-black uppercase">${name}</span>
                </div>`;
    });
    selectors.compMenu.innerHTML = html;
    selectors.compMenu.querySelectorAll('.comp-option').forEach(item => {
        item.onclick = (e) => {
            e.stopPropagation();
            state.currentCompId = item.dataset.value;
            selectors.compSelectedText.textContent = item.dataset.name || allComps;
            selectors.compMenu.classList.add('hidden');
            renderLines();
        };
    });
}

export function updateCompanyDropdown() {
    if (!state.currentPrefId) {
        populateCompanies(state.companies);
        return;
    }
    const validLineIds = new Set(state.localStations
        .filter(s => String(s.pref_cd || s.pref_id) === String(state.currentPrefId))
        .map(s => String(s.line_id)));
    const validCompanyIds = new Set();
    validLineIds.forEach(lId => {
        const line = state.localLines[lId];
        if (line && (line.company_id || line.company_cd)) {
            validCompanyIds.add(String(line.company_id || line.company_cd));
        }
    });
    populateCompanies(state.companies.filter(c => validCompanyIds.has(String(c.company_id || c.id))));
}

export function handleSearch(e) {
    const query = e.target.value.trim().toLowerCase();
    const lang = getLanguage();
    
    if (!query) {
        selectors.searchDropdown.classList.add('hidden');
        return;
    }
    
    const matchedLines = Object.entries(state.localLines)
        .filter(([, d]) => (d.name_en || '').toLowerCase().includes(query) || (d.name_jp || '').toLowerCase().includes(query))
        .slice(0, 5);

    const stationGroups = {};
    state.localStations.forEach(s => {
        const nameEn = (s.station_name_en || '').toLowerCase();
        const nameJp = (s.station_name_jp || '').toLowerCase();
        if (!nameEn.includes(query) && !nameJp.includes(query)) return;

        const gid = s.station_g_id || s.id;
        if (!stationGroups[gid]) {
            stationGroups[gid] = {
                name: lang === 'ja'
                    ? (s.station_name_jp || s.station_name_en || t('common.unknown'))
                    : (s.station_name_en || s.station_name_jp || t('common.unknown')),
                stations: []
            };
        }
        stationGroups[gid].stations.push(s);
    });

    const stationEntries = Object.entries(stationGroups).slice(0, 15);

    if (matchedLines.length === 0 && stationEntries.length === 0) {
        selectors.searchDropdown.innerHTML = `<div class="px-6 py-4 text-sm font-black uppercase text-gray-400">${t('common.noResults')}</div>`;
        selectors.searchDropdown.classList.remove('hidden');
        return;
    }

    let html = '';
    matchedLines.forEach(([id, data]) => {
        const lineName = lang === 'ja' ? (data.name_jp || data.name_en) : (data.name_en || data.name_jp);
        html += `<div class="search-result flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 border-b-[2px] border-black last:border-b-0" data-type="line" data-line-id="${escapeHtml(id)}">
                    <div class="w-10 h-3 rounded-full border-[2px] border-black shrink-0" style="background-color:${data.color}"></div>
                    <span class="text-sm font-black uppercase">${escapeHtml(lineName)}</span>
                </div>`;
    });

    stationEntries.forEach(([, group]) => {
        if (group.stations.length === 1) {
            const s = group.stations[0];
            const line = state.localLines[String(s.line_id)];
            const lineName = line ? (lang === 'ja' ? (line.name_jp || line.name_en) : (line.name_en || line.name_jp)) : '';

            html += `<div class="search-result flex items-center gap-3 px-6 py-4 cursor-pointer hover:bg-gray-50 border-b-[2px] border-black last:border-b-0" data-type="station" data-line-id="${escapeHtml(s.line_id)}" data-station-id="${escapeHtml(s.id || s.station_id || '')}">
                        <div class="w-4 h-4 rounded-full border-[3px] border-black shrink-0 bg-white" style="border-color:${line?.color || '#000'}"></div>
                        <span class="text-sm font-black uppercase">${escapeHtml(group.name)}</span>
                        <span class="ml-auto text-[10px] font-black uppercase text-gray-400">${escapeHtml(lineName)}</span>
                    </div>`;
            return;
        }

        const colorDots = group.stations.slice(0, 4).map(s => {
            const line = state.localLines[String(s.line_id)];
            return `<div class="w-3 h-3 rounded-full border-[2px] border-black shrink-0" style="background-color:${line?.color || '#000'}"></div>`;
        }).join('');

        const subItems = group.stations.map(s => {
            const line = state.localLines[String(s.line_id)];
            const lineName = line
                ? (lang === 'ja' ? (line.name_jp || line.name_en) : (line.name_en || line.name_jp))
                : `Line ${s.line_id || ''}`;

            return `<div class="search-result flex items-center gap-2 px-6 py-3 cursor-pointer hover:bg-gray-50" data-type="station" data-line-id="${escapeHtml(s.line_id)}" data-station-id="${escapeHtml(s.id || s.station_id || '')}">
                        <div class="w-3 h-3 rounded-full border-[2px] border-black shrink-0" style="background-color:${line?.color || '#000'}"></div>
                        <span class="text-xs font-black uppercase">${escapeHtml(lineName)}</span>
                    </div>`;
        }).join('');

        html += `<div class="border-b-[2px] border-black last:border-b-0">
                    <div class="multi-station-header flex items-center gap-3 px-6 py-4 cursor-pointer hover:bg-gray-50">
                        <div class="flex gap-1">${colorDots}</div>
                        <span class="text-sm font-black uppercase">${escapeHtml(group.name)}</span>
                        <svg class="multi-chevron ml-auto w-4 h-4 shrink-0 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M6 9l6 6 6-6"/>
                        </svg>
                    </div>
                    <div class="multi-station-sub hidden border-t-[2px] border-black/20">${subItems}</div>
                </div>`;
    });

    selectors.searchDropdown.innerHTML = html;
    selectors.searchDropdown.classList.remove('hidden');

    selectors.searchDropdown.querySelectorAll('.search-result').forEach(item => {
        item.onclick = async () => {
            const type = item.dataset.type;
            const lineId = item.dataset.lineId;
            const stationId = item.dataset.stationId;

            selectors.searchDropdown.classList.add('hidden');
            selectors.searchInput.value = '';

            if (!lineId) return;
            await showLineDetail(lineId);

            if (type !== 'station' || !stationId) return;

            const stationNodes = selectors.detailStationsList?.querySelectorAll('.station-name-click') || [];
            const stationNode = Array.from(stationNodes).find(node => String(node.dataset.stationId) === String(stationId));
            if (!stationNode) return;

            stationNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const originalColor = stationNode.style.color;
            stationNode.style.color = '#ff4081';
            setTimeout(() => {
                stationNode.style.color = originalColor;
            }, 1000);
        };
    });

    selectors.searchDropdown.querySelectorAll('.multi-station-header').forEach(header => {
        header.onclick = () => {
            const sub = header.nextElementSibling;
            const chevron = header.querySelector('.multi-chevron');
            sub.classList.toggle('hidden');
            chevron?.classList.toggle('rotate-180');
        };
    });
}