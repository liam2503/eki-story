import { db } from './firebase.js';
import { collection, getDocs } from 'firebase/firestore';
import { state, selectors } from './list_state.js';
import { renderLines, renderNextChunk } from './list_render.js';
import { populatePrefectures, populateCompanies, handleSearch } from './list_search.js';

async function initList() {
    if (!selectors.listFrame) return;

    state.localStations = window.allStations || JSON.parse(localStorage.getItem('stationData') || '[]');
    state.localLines = window.lineData || window.lineColors || JSON.parse(localStorage.getItem('lineData') || '{}');

    const [prefSnap, compSnap] = await Promise.all([
        getDocs(collection(db, 'prefectures')),
        getDocs(collection(db, 'companies'))
    ]);
    state.prefectures = prefSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    state.companies = compSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    populatePrefectures();
    populateCompanies();

    state.observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) renderNextChunk();
    }, { root: null, rootMargin: '200px' });

    selectors.prefSelector.onclick = (e) => { e.stopPropagation(); selectors.prefMenu.classList.toggle('hidden'); selectors.compMenu.classList.add('hidden'); };
    selectors.compSelector.onclick = (e) => { e.stopPropagation(); selectors.compMenu.classList.toggle('hidden'); selectors.prefMenu.classList.add('hidden'); };
    selectors.searchInput.oninput = handleSearch;

    if (selectors.backBtn) {
        selectors.backBtn.onclick = () => {
            selectors.detailContainer.classList.add('translate-x-full');
            setTimeout(() => {
                selectors.detailContainer.classList.add('hidden');
            }, 300);
        };
    }

    window.addEventListener('visitedDataUpdated', () => {
        renderLines();
    });

    renderLines();
}

document.addEventListener('click', (e) => {
    if (!selectors.searchInput.contains(e.target)) selectors.searchDropdown.classList.add('hidden');
    if (!selectors.prefSelector.contains(e.target)) selectors.prefMenu.classList.add('hidden');
    if (!selectors.compSelector.contains(e.target)) selectors.compMenu.classList.add('hidden');
});

initList();