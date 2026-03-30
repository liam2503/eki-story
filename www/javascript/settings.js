import { idbClear } from './idb.js';
import { auth } from './firebase.js';
import { signOut } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

const DARK_MODE_KEY = 'eki-dark-mode';
const SOUND_KEY = 'eki-sound';

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

export function initSettingsFrame() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const soundToggle = document.getElementById('sound-toggle');
    const signOutBtn = document.getElementById('sign-out-btn');
    const refreshBtn = document.getElementById('refresh-db-btn');

    const savedDark = localStorage.getItem(DARK_MODE_KEY) === 'true';
    const savedSound = localStorage.getItem(SOUND_KEY) !== 'false';

    if (darkModeToggle) {
        setToggle(darkModeToggle, savedDark);
        darkModeToggle.onclick = function () {
            const isDark = darkModeToggle.classList.contains('bg-gray-300');
            applyDarkMode(isDark);
            localStorage.setItem(DARK_MODE_KEY, isDark);
            setToggle(darkModeToggle, isDark);
        };
    }

    if (soundToggle) {
        setToggle(soundToggle, savedSound);
        soundToggle.onclick = function () {
            const willBeOn = soundToggle.classList.contains('bg-gray-300');
            setToggle(soundToggle, willBeOn);
            localStorage.setItem(SOUND_KEY, willBeOn);
        };
    }

    if (signOutBtn) {
        if (auth.currentUser && auth.currentUser.isAnonymous) {
            signOutBtn.disabled = true;
            signOutBtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-gray-300');
            signOutBtn.classList.remove('active:translate-y-[4px]', 'active:translate-x-[4px]', 'active:shadow-none', 'hover:translate-y-[2px]'); 
            signOutBtn.innerText = "Sign Out (Guest)";
        } else {
            signOutBtn.disabled = false;
            signOutBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-gray-300');
            
            signOutBtn.onclick = async () => {
                try {
                    localStorage.clear();
                    sessionStorage.clear();
                    await idbClear();
                    
                    if (Capacitor.isNativePlatform()) {
                        try {
                            await GoogleAuth.signOut();
                        } catch (e) {
                        }
                    }

                    await signOut(auth);
                    window.location.reload(); 
                } catch (err) {
                }
            };
        }
    }

    if (refreshBtn) {
        refreshBtn.onclick = async function() {
            localStorage.clear();
            await idbClear();
            window.location.reload();
        };
    }
}

document.addEventListener('turbo:frame-load', (e) => {
    if (e.target.id === 'settings-frame') {
        initSettingsFrame();
    }
});