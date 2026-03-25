import { db } from './firebase.js';
import { collection, getDocs } from 'firebase/firestore';
import { state, selectors } from './list_state.js';
import { renderLines, renderNextChunk } from './list_render.js';
import { populatePrefectures, populateCompanies, handleSearch } from './list_search.js';

async function initList() {
    if (!selectors.listFrame) return;

    // Load initial data
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

    // UI Click Handlers
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

    // NEW: Listen for the data update and trigger render
    window.addEventListener('visitedDataUpdated', () => {
        renderLines();
    });

    // Initial render attempt
    renderLines();
}

export function initStampScanner(existingButtonId) {
    const addStampBtn = document.getElementById(existingButtonId);
    const addStampContainer = document.getElementById("add-stamp-container");
    const closeStampBtn = document.getElementById("close-stamp-btn");
    const videoElement = document.getElementById("camera-feed");
    const canvasElement = document.getElementById("camera-canvas");
    const placeholderElement = document.getElementById("camera-placeholder");
    const captureBtn = document.getElementById("capture-stamp-btn");

    let cameraStream = null;

    if (!addStampBtn || !addStampContainer) return;

    async function startCamera() {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            videoElement.srcObject = cameraStream;
            videoElement.classList.remove('hidden');
            placeholderElement.classList.add('hidden');
        } catch (err) {
            placeholderElement.innerHTML = `<span class="text-red-500 font-black uppercase text-center px-4">Camera Access Denied</span>`;
        }
    }

    function stopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        videoElement.classList.add('hidden');
        placeholderElement.classList.remove('hidden');
    }

    addStampBtn.addEventListener('click', () => {
        addStampContainer.classList.remove("translate-y-full", "pointer-events-none");
        startCamera();
    });

    closeStampBtn.addEventListener('click', () => {
        addStampContainer.classList.add("translate-y-full", "pointer-events-none");
        stopCamera();
    });

    captureBtn.addEventListener('click', () => {
        if (!cameraStream) return;
        
        const context = canvasElement.getContext('2d');
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        
        const imageDataUrl = canvasElement.toDataURL('image/png');
        
        stopCamera();
        addStampContainer.classList.add("translate-y-full", "pointer-events-none");
        
        console.log("Image ready for OpenCV:", imageDataUrl);
    });
}

document.addEventListener('click', (e) => {
    if (!selectors.searchInput.contains(e.target)) selectors.searchDropdown.classList.add('hidden');
    if (!selectors.prefSelector.contains(e.target)) selectors.prefMenu.classList.add('hidden');
    if (!selectors.compSelector.contains(e.target)) selectors.compMenu.classList.add('hidden');
});

initList();
