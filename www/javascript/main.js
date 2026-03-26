import { initButtons } from './ui.js';
import { initSearch } from './search.js';
import { initProfileSync, isVisited, toggleStation } from './user.js';
import { initStampScanner, showLineDetail, getCurrentLineId } from './list_detail.js';
import { initModelUI } from './model_ui.js';
import { initSettings } from './settings.js';

window.isVisited = isVisited;

function initAll() {
    initSettings();
    initButtons();
    initSearch();
    initProfileSync();
    initStampScanner();
    initModelUI(() => {
        const lineId = getCurrentLineId();
        if (lineId) showLineDetail(lineId);
    });
}

document.addEventListener("DOMContentLoaded", initAll);
document.addEventListener("turbo:load", initAll);