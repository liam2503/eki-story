import { initButtons } from './ui.js';
import { initSearch } from './search.js';
import { isVisited } from './user.js';
import { initStampScanner, showLineDetail, getCurrentLineId } from './list_detail.js';
import { initModelUI } from './model_ui.js';
import { initSettings } from './settings.js';
import { initAuth } from './auth.js';
import { Capacitor } from '@capacitor/core';
import { initStampBook } from './stamp_book.js';
import './profile.js';
import { t } from './i18n.js';

const platform = Capacitor.getPlatform();
document.documentElement.classList.add(platform);

window.isVisited = isVisited;
window.showLineDetail = showLineDetail;


let isInitialized = false;


let isAuthResolved = false;
let isMapInitialized = false;

function checkAppReady() {
    if (isAuthResolved && isMapInitialized) {
        const overlay = document.getElementById('app-loading-overlay');
        if (overlay) {
            overlay.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => overlay.remove(), 500);
        }
    }
}

window.addEventListener('authResolved', () => {
    isAuthResolved = true;
    checkAppReady();
});

window.addEventListener('mapInitialized', () => {
    isMapInitialized = true;
    checkAppReady();
});


function initAll() {
    if (isInitialized) return;
    isInitialized = true;

    const alertTitle = document.getElementById('generic-alert-title');
    const alertMsg = document.getElementById('generic-alert-message');
    
    if (alertTitle) alertTitle.innerText = t('settings.actionFailedTitle');
    if (alertMsg) alertMsg.innerText = t('settings.actionFailedMessage');

    initSettings();
    initButtons();
    initSearch();
    initAuth(); 
    initStampScanner();
    initStampBook();
    initModelUI(() => {
        const lineId = getCurrentLineId();
        if (lineId) showLineDetail(lineId);
    });
}


if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initAll();
} else {
    
    document.addEventListener("DOMContentLoaded", initAll);
}
