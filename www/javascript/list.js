import { idbGet, idbSet } from './idb.js';
import { db } from './firebase.js';
import { collection, getDocs } from 'firebase/firestore';
import { state, selectors } from './list_state.js';
import { renderLines, renderNextChunk } from './list_render.js';
import { populatePrefectures, populateCompanies, handleSearch } from './list_search.js';
import { playReturnSound } from './audio.js';
import { applyTranslations } from './i18n.js';

async function initList() {
    if (!selectors.listFrame) return;

    applyTranslations();

    state.localStations = window.allStations || await idbGet('stationData') || [];
    state.localLines = window.lineData || window.lineColors || await idbGet('lineData') || {};

    let prefs = await idbGet('prefecturesData');
    let comps = await idbGet('companiesData');

    // Force re-fetch if cached data is missing Japanese names (stale cache).
    // TODO: remove this guard after all clients have refreshed stale caches (post-deploy).
    const hasJapanesePrefNames = prefs && prefs.some(p =>
        p.pref_name_jp && /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/.test(p.pref_name_jp)
    );
    const hasJapaneseCompNames = comps && comps.some(c =>
        c.company_name_jp && /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/.test(c.company_name_jp)
    );
    if (!prefs || !comps || !hasJapanesePrefNames || !hasJapaneseCompNames) {
        const [prefSnap, compSnap] = await Promise.all([
            getDocs(collection(db, 'prefectures')),
            getDocs(collection(db, 'companies'))
        ]);
        prefs = prefSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        comps = compSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        await idbSet('prefecturesData', prefs);
        await idbSet('companiesData', comps);
    }

    state.prefectures = prefs;
    state.companies = comps;

    populatePrefectures();
    populateCompanies();

    state.observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) renderNextChunk();
    }, { root: null, rootMargin: '200px' });

    if (selectors.prefSelector) {
        selectors.prefSelector.onclick = (e) => { e.stopPropagation(); selectors.prefMenu.classList.toggle('hidden'); selectors.compMenu.classList.add('hidden'); };
    }
    
    if (selectors.compSelector) {
        selectors.compSelector.onclick = (e) => { e.stopPropagation(); selectors.compMenu.classList.toggle('hidden'); selectors.prefMenu.classList.add('hidden'); };
    }
    
    if (selectors.searchInput) {
        selectors.searchInput.oninput = handleSearch;
    }

    if (selectors.backBtn) {
        selectors.backBtn.onclick = () => {
            playReturnSound();
            selectors.detailContainer.classList.add('translate-x-full');
            setTimeout(() => {
                selectors.detailContainer.classList.add('hidden');
            }, 300);
        };
    }

    window.addEventListener('visitedDataUpdated', renderLines);
    window.addEventListener('stationsLoaded', renderLines);
    window.addEventListener('lineDataLoaded', renderLines);
    
    setTimeout(renderLines, 500);
    setTimeout(renderLines, 1500);

    renderLines();
}

document.addEventListener('click', (e) => {
    if (selectors.searchInput && !selectors.searchInput.contains(e.target) && selectors.searchDropdown) {
        selectors.searchDropdown.classList.add('hidden');
    }
    if (selectors.prefSelector && !selectors.prefSelector.contains(e.target) && selectors.prefMenu) {
        selectors.prefMenu.classList.add('hidden');
    }
    if (selectors.compSelector && !selectors.compSelector.contains(e.target) && selectors.compMenu) {
        selectors.compMenu.classList.add('hidden');
    }
});

document.addEventListener('turbo:frame-load', (e) => {
    if (e.target.id === 'list-frame') {
        applyTranslations();
    }
});

initList();