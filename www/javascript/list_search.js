import { state, selectors } from './list_state.js';
import { renderLines } from './list_render.js';
import { getLanguage, t } from './i18n.js';

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
    
    const matchedLines = Object.entries(state.localLines).filter(([, d]) => (d.name_en || '').toLowerCase().includes(query) || (d.name_jp || '').toLowerCase().includes(query)).slice(0, 5);

    let html = '';
    matchedLines.forEach(([id, data]) => {
        const lineName = lang === 'ja' ? (data.name_jp || data.name_en) : (data.name_en || data.name_jp);
        html += `<div class="search-result flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 border-b-[2px] border-black last:border-b-0" onclick="window.selectLineAndScroll('${id}')">
                    <div class="w-10 h-3 rounded-full border-[2px] border-black shrink-0" style="background-color:${data.color}"></div>
                    <span class="text-sm font-black uppercase">${lineName}</span>
                </div>`;
    });
    selectors.searchDropdown.innerHTML = html || `<div class="px-6 py-4 text-sm font-black uppercase text-gray-400">${t('common.noResults')}</div>`;
    selectors.searchDropdown.classList.remove('hidden');
}

window.selectLineAndScroll = (lineId) => {
    selectors.searchDropdown.classList.add('hidden');
    selectors.searchInput.value = '';
    
    const card = document.getElementById(`line-card-${lineId}`);
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        const originalTransition = card.style.transition;
        card.style.transition = 'all 0.3s ease';
        card.style.borderColor = '#FF80AB';
        card.style.transform = 'scale(1.02)';
        
        setTimeout(() => {
            card.style.borderColor = 'black';
            card.style.transform = 'scale(1)';
            setTimeout(() => {
                card.style.transition = originalTransition;
            }, 300);
        }, 1500);
    }
};