import { initButtons } from './ui.js';
import { initSearch } from './search.js';
import { initProfileSync, isVisited, toggleStation } from './user.js';
import { initStampScanner } from './list_detail.js';

initStampScanner();

window.isVisited = isVisited;

const unlockBtn = document.getElementById("debug-unlock");
if (unlockBtn) {
    unlockBtn.onclick = async () => {
        if (window.activeStationId) {
            await toggleStation(window.activeStationId);
            console.log(`Toggled station: ${window.activeStationId}`);
        }
    };
}

const refreshBtn = document.getElementById("refresh-db");
if (refreshBtn) {
    refreshBtn.onclick = () => {
        localStorage.clear();
        window.location.reload();
    };
}

function initAll() {
    initButtons();
    initSearch();
    initProfileSync();
}

document.addEventListener("DOMContentLoaded", initAll);
document.addEventListener("turbo:load", initAll);
document.addEventListener("turbo:frame-load", initButtons);