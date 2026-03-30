import { idbClear } from './idb.js';
import { auth } from './firebase.js';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { showAuthScreen } from './auth.js';
import { updateUserSetting } from './user.js';

const DARK_MODE_KEY = 'eki-dark-mode';
const SOUND_KEY = 'eki-sound';
const DECLINE_REQUESTS_KEY = 'eki-decline-requests';

const LIGHT_STYLES = [
    { featureType: 'all', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'landscape', stylers: [{ color: '#A5D6A7' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative', stylers: [{ visibility: 'off' }] },
];
const DARK_STYLES = [
    { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
    { elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d2d44' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a3a5c' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative', stylers: [{ visibility: 'off' }] },
];

function getMapStyles(isDark) {
    return isDark ? DARK_STYLES : LIGHT_STYLES;
}

window.getInitialMapStyles = () => getMapStyles(localStorage.getItem(DARK_MODE_KEY) === 'true');

function applyDarkMode(isDark) {
    document.documentElement.classList.toggle('dark', isDark);
    if (window.map && typeof window.map.setOptions === 'function') {
        window.map.setOptions({ styles: getMapStyles(isDark) });
    }
}

function setToggle(btn, isOn) {
    const knob = btn.querySelector('.toggle-knob');
    if (isOn) {
        btn.classList.add('bg-[#B2FF59]');
        btn.classList.remove('bg-gray-300');
    } else {
        btn.classList.remove('bg-[#B2FF59]');
        btn.classList.add('bg-gray-300');
    }
    if (knob) knob.style.transform = isOn ? 'translateX(1.5rem)' : 'translateX(0)';
}

export function initSettings() {
    const savedDark = localStorage.getItem(DARK_MODE_KEY) === 'true';
    applyDarkMode(savedDark);
    
    window.getInitialColorScheme = () =>
        localStorage.getItem(DARK_MODE_KEY) === 'true' ? 'DARK' : 'LIGHT';

    const settingsContainer = document.getElementById('settings-container');
    const settingsBtn = document.getElementById('icon-shell-s');

    if (settingsBtn) {
        settingsBtn.onclick = function () {
            const isOpen = !settingsContainer.classList.contains('-translate-x-full');
            if (isOpen) {
                settingsContainer.classList.add('-translate-x-full', 'pointer-events-none');
            } else {
                window.resetUI?.();
                settingsContainer.classList.remove('-translate-x-full', 'pointer-events-none');
            }
        };
    }
}

let authUnsubscribe = null;

export function initSettingsFrame() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const soundToggle = document.getElementById('sound-toggle');
    const declineRequestsToggle = document.getElementById('decline-requests-toggle');
    const signOutBtn = document.getElementById('sign-out-btn');
    const refreshBtn = document.getElementById('refresh-db-btn');

    const savedDark = localStorage.getItem(DARK_MODE_KEY) === 'true';
    const savedSound = localStorage.getItem(SOUND_KEY) !== 'false';
    const savedDeclineRequests = localStorage.getItem(DECLINE_REQUESTS_KEY) === 'true';

    if (darkModeToggle) {
        setToggle(darkModeToggle, savedDark);
        darkModeToggle.onclick = async function () {
            const isDark = darkModeToggle.classList.contains('bg-gray-300');
            applyDarkMode(isDark);
            localStorage.setItem(DARK_MODE_KEY, isDark);
            setToggle(darkModeToggle, isDark);
            await updateUserSetting(DARK_MODE_KEY, isDark);
            window.location.reload();
        };
    }

    if (soundToggle) {
        setToggle(soundToggle, savedSound);
        soundToggle.onclick = async function () {
            const willBeOn = soundToggle.classList.contains('bg-gray-300');
            setToggle(soundToggle, willBeOn);
            localStorage.setItem(SOUND_KEY, willBeOn);
            await updateUserSetting(SOUND_KEY, willBeOn);
        };
    }

    if (declineRequestsToggle) {
        setToggle(declineRequestsToggle, savedDeclineRequests);
        declineRequestsToggle.onclick = async function () {
            const willBeOn = declineRequestsToggle.classList.contains('bg-gray-300');
            setToggle(declineRequestsToggle, willBeOn);
            localStorage.setItem(DECLINE_REQUESTS_KEY, willBeOn);
            await updateUserSetting(DECLINE_REQUESTS_KEY, willBeOn);
        };
    }

    if (signOutBtn) {
        if (authUnsubscribe) authUnsubscribe();
        
        authUnsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user || user.isAnonymous) {
                signOutBtn.innerText = "Sign In / Create An Account";
                signOutBtn.onclick = () => {
                    window.resetUI?.();
                    showAuthScreen();
                };
            } else {
                signOutBtn.innerText = "Sign Out";
                signOutBtn.onclick = async () => {
                    try {
                        localStorage.clear();
                        sessionStorage.clear();
                        await idbClear();
                        
                        if (Capacitor.isNativePlatform()) {
                            try {
                                await GoogleAuth.signOut();
                            } catch (e) {}
                        }

                        await signOut(auth);
                        window.location.reload(); 
                    } catch (err) {}
                };
            }
        });
    }

    if (refreshBtn) {
        refreshBtn.onclick = function(e) {
            e.preventDefault();
            
            const loadingOverlay = document.getElementById('app-loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
                loadingOverlay.classList.add('opacity-100');
                loadingOverlay.style.zIndex = '9999';
            }
            
            setTimeout(async () => {
                try {
                    localStorage.clear();
                    await idbClear();
                } catch (err) {}
                window.location.reload();
            }, 150);
        };
    }
}

window.addEventListener('settingsSynced', () => {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const soundToggle = document.getElementById('sound-toggle');
    const declineRequestsToggle = document.getElementById('decline-requests-toggle');
    
    if (darkModeToggle) setToggle(darkModeToggle, localStorage.getItem(DARK_MODE_KEY) === 'true');
    if (soundToggle) setToggle(soundToggle, localStorage.getItem(SOUND_KEY) !== 'false');
    if (declineRequestsToggle) setToggle(declineRequestsToggle, localStorage.getItem(DECLINE_REQUESTS_KEY) === 'true');
});

document.addEventListener('turbo:frame-load', (e) => {
    if (e.target.id === 'settings-frame') {
        initSettingsFrame();
    }
});