const DARK_MODE_KEY = 'eki-dark-mode';
const SOUND_KEY = 'eki-sound';

function applyDarkMode(isDark) {
    document.documentElement.classList.toggle('dark', isDark);
    if (window.map) {
        window.map.setOptions({ colorScheme: isDark ? 'DARK' : 'LIGHT' });
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
    const settingsContainer = document.getElementById('settings-container');
    if (!settingsContainer) return;

    const settingsBtn = document.getElementById('icon-shell-s');
    const settingsCloseBtn = document.getElementById('settings-close-btn');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const soundToggle = document.getElementById('sound-toggle');
    const signOutBtn = document.getElementById('sign-out-btn');

    // Load and apply saved preferences
    const savedDark = localStorage.getItem(DARK_MODE_KEY) === 'true';
    const savedSound = localStorage.getItem(SOUND_KEY) !== 'false';

    applyDarkMode(savedDark);
    if (darkModeToggle) setToggle(darkModeToggle, savedDark);
    if (soundToggle) setToggle(soundToggle, savedSound);

    // Expose color scheme getter — rail.js uses this at map init time
    window.getInitialColorScheme = () =>
        localStorage.getItem(DARK_MODE_KEY) === 'true' ? 'DARK' : 'LIGHT';

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

    if (settingsCloseBtn) {
        settingsCloseBtn.onclick = () =>
            settingsContainer.classList.add('-translate-x-full', 'pointer-events-none');
    }

    if (darkModeToggle) {
        darkModeToggle.onclick = function () {
            const isDark = darkModeToggle.classList.contains('bg-gray-300');
            applyDarkMode(isDark);
            localStorage.setItem(DARK_MODE_KEY, isDark);
            setToggle(darkModeToggle, isDark);
        };
    }

    if (soundToggle) {
        soundToggle.onclick = function () {
            const willBeOn = soundToggle.classList.contains('bg-gray-300');
            setToggle(soundToggle, willBeOn);
            localStorage.setItem(SOUND_KEY, willBeOn);
        };
    }

    if (signOutBtn) {
        signOutBtn.onclick = () => console.log('Sign out tapped');
    }
}
