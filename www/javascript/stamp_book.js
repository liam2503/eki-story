import { userStamps, userStampDates } from './user.js';
import { state } from './list_state.js';
import { getLanguage, t } from './i18n.js';

let currentPage = 0;
let sortedStamps = [];

export function initStampBook() {
    const btn = document.getElementById('stamp-book-btn');
    const cont = document.getElementById('stamp-book-container');
    const closeBtn = document.getElementById('close-book-btn');
    const prevBtn = document.getElementById('book-prev-btn');
    const nextBtn = document.getElementById('book-next-btn');
    const memoInput = document.getElementById('book-stamp-memo');

    if(btn) btn.onclick = openBook;

    if(closeBtn) {
        closeBtn.onclick = () => {
            saveCurrentMemo();
            cont.classList.add('translate-y-full');
            setTimeout(() => cont.classList.add('pointer-events-none'), 500);
        };
    }

    if(prevBtn) {
        prevBtn.onclick = () => {
            if (currentPage > 0) {
                saveCurrentMemo();
                currentPage--;
                renderPage();
            }
        };
    }

    if(nextBtn) {
        nextBtn.onclick = () => {
            if (currentPage < sortedStamps.length - 1) {
                saveCurrentMemo();
                currentPage++;
                renderPage();
            }
        };
    }

    let memoTimeout;
    if(memoInput) {
        memoInput.addEventListener('input', () => {
            clearTimeout(memoTimeout);
            memoTimeout = setTimeout(saveCurrentMemo, 500);
        });
    }
}

function openBook() {
    const cont = document.getElementById('stamp-book-container');
    const lang = getLanguage();
    
    sortedStamps = Object.keys(userStamps).map(stationId => {
        const ts = userStampDates[stationId] || 0;
        const station = state.localStations.find(s => String(s.id) === String(stationId));
        const stationName = station ? (lang === 'ja' ? (station.station_name_jp || station.station_name_en) : (station.station_name_en || station.station_name_jp)) : t('common.unknown');
        
        return {
            stationId,
            image: userStamps[stationId],
            date: ts ? new Date(ts).toLocaleDateString() : 'Unknown Date',
            name: stationName,
            ts: ts
        };
    }).sort((a, b) => b.ts - a.ts);

    currentPage = 0;
    renderPage();

    cont.classList.remove('pointer-events-none');
    cont.classList.remove('translate-y-full');
}

function renderPage() {
    const emptyState = document.getElementById('book-empty-state');
    const imgEl = document.getElementById('book-stamp-image');
    const nameEl = document.getElementById('book-station-name');
    const dateEl = document.getElementById('book-stamp-date');
    const memoEl = document.getElementById('book-stamp-memo');
    const indicator = document.getElementById('book-page-indicator');
    const prevBtn = document.getElementById('book-prev-btn');
    const nextBtn = document.getElementById('book-next-btn');

    if (sortedStamps.length === 0) {
        emptyState.classList.remove('hidden');
        imgEl.src = '';
        nameEl.innerText = '';
        dateEl.innerText = '';
        memoEl.value = '';
        indicator.innerText = '0 / 0';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    emptyState.classList.add('hidden');
    const current = sortedStamps[currentPage];

    const randomRotation = (Math.random() * 8 - 4).toFixed(1);
    imgEl.style.transform = `rotate(${randomRotation}deg)`;
    
    imgEl.src = current.image;
    nameEl.innerText = current.name;
    dateEl.innerText = current.date;

    const savedMemo = localStorage.getItem(`eki-memo-${current.stationId}`) || '';
    memoEl.value = savedMemo;

    indicator.innerText = `${currentPage + 1} / ${sortedStamps.length}`;
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage === sortedStamps.length - 1;
}

function saveCurrentMemo() {
    if (sortedStamps.length === 0) return;
    const current = sortedStamps[currentPage];
    const memoEl = document.getElementById('book-stamp-memo');
    if (current && memoEl) {
        localStorage.setItem(`eki-memo-${current.stationId}`, memoEl.value);
    }
}