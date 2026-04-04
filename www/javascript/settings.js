import { idbClear } from './idb.js';
import { auth } from './firebase.js';
import { signOut, onAuthStateChanged, deleteUser } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { showAuthScreen } from './auth.js';
import { updateUserSetting } from './user.js';
import { applyTranslations, getLanguage, setLanguage, t } from './i18n.js';

const DARK_MODE_KEY = 'eki-dark-mode';
const SOUND_KEY = 'eki-sound';
const DECLINE_REQUESTS_KEY = 'eki-decline-requests';
const LANG_KEY = 'eki-language';

const LIGHT_STYLES = [
    { featureType: 'all', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'landscape', stylers: [{ color: '#A5D6A7' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#90CAF9' }] },
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
    applyTranslations();

    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const soundToggle = document.getElementById('sound-toggle');
    const declineRequestsToggle = document.getElementById('decline-requests-toggle');
    const refreshBtn = document.getElementById('refresh-db-btn');
    const langEnBtn = document.getElementById('lang-en-btn');
    const langJaBtn = document.getElementById('lang-ja-btn');

    const savedDark = localStorage.getItem(DARK_MODE_KEY) === 'true';
    const savedSound = localStorage.getItem(SOUND_KEY) !== 'false';
    const savedDeclineRequests = localStorage.getItem(DECLINE_REQUESTS_KEY) === 'true';

    function updateSettingsLangUI(lang) {
        if (lang === 'en') {
            langEnBtn.classList.add('bg-[#B2FF59]', 'text-black');
            langEnBtn.classList.remove('bg-transparent', 'text-gray-600');
            langJaBtn.classList.add('bg-transparent', 'text-gray-600');
            langJaBtn.classList.remove('bg-[#B2FF59]', 'text-black');
        } else {
            langJaBtn.classList.add('bg-[#B2FF59]', 'text-black');
            langJaBtn.classList.remove('bg-transparent', 'text-gray-600');
            langEnBtn.classList.add('bg-transparent', 'text-gray-600');
            langEnBtn.classList.remove('bg-[#B2FF59]', 'text-black');
        }
    }

    if (langEnBtn && langJaBtn) {
        updateSettingsLangUI(getLanguage());
        
        langEnBtn.onclick = async function() {
            if (getLanguage() !== 'en') {
                setLanguage('en');
                await updateUserSetting('language', 'en');
                window.location.reload();
            }
        };
        
        langJaBtn.onclick = async function() {
            if (getLanguage() !== 'ja') {
                setLanguage('ja');
                await updateUserSetting('language', 'ja');
                window.location.reload();
            }
        };
    }

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

    const updateAuthBtnUI = (user) => {
        const currentSignOutBtn = document.getElementById('sign-out-btn');
        const currentDeleteBtn = document.getElementById('delete-account-btn');

        if (currentSignOutBtn) {
            if (!user || user.isAnonymous) {
                currentSignOutBtn.innerText = t('settings.loginOrSignUp') || "Sign In / Create An Account";
                currentSignOutBtn.onclick = () => {
                    window.resetUI?.();
                    showAuthScreen();
                };
            } else {
                currentSignOutBtn.innerText = t('settings.signOut') || "Sign Out";
                currentSignOutBtn.onclick = async () => {
                    try {
                        localStorage.clear();
                        sessionStorage.clear();
                        const { idbClear } = await import('./idb.js');
                        await idbClear();
                        
                        if (Capacitor.isNativePlatform()) {
    try {
        await SocialLogin.logout();
    } catch (e) {}
}

                        await signOut(auth);
                        window.location.reload(); 
                    } catch (err) {}
                };
            }
        }

        if (currentDeleteBtn) {
            if (user) {
                currentDeleteBtn.classList.remove('hidden');
                currentDeleteBtn.onclick = () => {
                    const confirmModal = document.getElementById('generic-confirm-modal');
                    const confirmBox = document.getElementById('generic-confirm-box');
                    
                    document.getElementById('generic-confirm-title').innerText = t('settings.deleteAccountTitle');
                    document.getElementById('generic-confirm-message').innerText = t('settings.deleteAccountMessage');
                    
                    confirmModal.classList.remove('opacity-0', 'pointer-events-none');
                    confirmBox.classList.remove('scale-95');
                    confirmBox.classList.add('scale-100');

                    document.getElementById('generic-confirm-cancel').onclick = () => {
                        confirmModal.classList.add('opacity-0', 'pointer-events-none');
                        confirmBox.classList.add('scale-95');
                        confirmBox.classList.remove('scale-100');
                    };

                    document.getElementById('generic-confirm-ok').onclick = async () => {
                        confirmModal.classList.add('opacity-0', 'pointer-events-none');
                        confirmBox.classList.add('scale-95');
                        confirmBox.classList.remove('scale-100');
                        
                        try {
                            await deleteUser(user);
                            localStorage.clear();
                            sessionStorage.clear();
                            const { idbClear } = await import('./idb.js');
                            await idbClear();
                            window.location.reload();
                        } catch (err) {
                            const alertModal = document.getElementById('generic-alert-modal');
                            const alertBox = document.getElementById('generic-alert-box');
                            document.getElementById('generic-alert-title').innerText = t('settings.actionFailedTitle') || "Action Failed";
                            document.getElementById('generic-alert-message').innerText = t('settings.actionFailedMessage') || "Failed to delete account. You may need to sign out and sign back in to verify your identity before deleting.";
                            
                            alertModal.classList.remove('opacity-0', 'pointer-events-none');
                            alertBox.classList.remove('scale-95');
                            alertBox.classList.add('scale-100');

                            document.getElementById('generic-alert-btn').onclick = () => {
                                alertModal.classList.add('opacity-0', 'pointer-events-none');
                                alertBox.classList.add('scale-95');
                                alertBox.classList.remove('scale-100');
                            };
                        }
                    };
                };
            } else {
                currentDeleteBtn.classList.add('hidden');
            }
        }
    };

    if (authUnsubscribe) authUnsubscribe();
    updateAuthBtnUI(auth.currentUser);
    authUnsubscribe = onAuthStateChanged(auth, updateAuthBtnUI);

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
                    // PRESERVE ESSENTIAL USER SETTINGS BEFORE CLEARING
                    const lang = localStorage.getItem(LANG_KEY);
                    const dark = localStorage.getItem(DARK_MODE_KEY);
                    const sound = localStorage.getItem(SOUND_KEY);
                    const decline = localStorage.getItem(DECLINE_REQUESTS_KEY);

                    // Preserve Firebase Auth session tokens so the user is not logged out
                    const firebaseEntries = {};
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith('firebase:')) {
                            firebaseEntries[key] = localStorage.getItem(key);
                        }
                    }

                    localStorage.clear();

                    if (lang) localStorage.setItem(LANG_KEY, lang);
                    if (dark) localStorage.setItem(DARK_MODE_KEY, dark);
                    if (sound) localStorage.setItem(SOUND_KEY, sound);
                    if (decline) localStorage.setItem(DECLINE_REQUESTS_KEY, decline);
                    for (const [key, val] of Object.entries(firebaseEntries)) {
                        localStorage.setItem(key, val);
                    }

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

let settingsFrameInitialized = false;

function checkAndInitSettings() {
    if (settingsFrameInitialized) return;
    if (document.getElementById('dark-mode-toggle')) {
        settingsFrameInitialized = true;
        initSettingsFrame();
    }
}

document.addEventListener('turbo:frame-load', (e) => {
    if (e.target.id === 'settings-frame') {
        settingsFrameInitialized = false;
        checkAndInitSettings();
    }
});

if (document.readyState === 'interactive' || document.readyState === 'complete') {
    setTimeout(checkAndInitSettings, 100);
} else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(checkAndInitSettings, 100));
}