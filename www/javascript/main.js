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

// State lock to prevent double-firing if both events manage to trigger
let isInitialized = false;

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

// 1. If the DOM is already parsed (common for module scripts), run immediately.
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initAll();
} else {
    // 2. Otherwise, wait for it.
    document.addEventListener("DOMContentLoaded", initAll);
}

// 3. Handle Hotwire Turbo page navigations.
document.addEventListener("turbo:load", () => {
    isInitialized = false; // Release the lock for the new page
    initAll();
});