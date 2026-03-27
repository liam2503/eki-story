export function initButtons() {
    const feedBtn = document.getElementById("icon-shell-0");
    const heartBtn = document.getElementById("icon-shell-1");
    const listBtn = document.getElementById("icon-shell-2");
    const userBtn = document.getElementById("user-shell");
    const refreshBtn = document.getElementById("refresh-db");

    const feedContainer = document.getElementById("feed-container");
    const listContainer = document.getElementById("list-container");
    const profileContainer = document.getElementById("profile-container");

    if (!feedBtn || !listBtn) return;

    function resetUI() {
        feedContainer.classList.add("-translate-x-full", "pointer-events-none");
        listContainer.classList.add("translate-x-full", "pointer-events-none");

        if (profileContainer) {
            profileContainer.classList.add("translate-x-full", "pointer-events-none");
        }

        const settingsContainer = document.getElementById("settings-container");
        if (settingsContainer) {
            settingsContainer.classList.add("-translate-x-full", "pointer-events-none");
        }

        const feedIcon = feedBtn.querySelector("svg");
        feedBtn.classList.remove("bg-[#FF80AB]");
        feedIcon.classList.remove("text-white");
        feedIcon.classList.add("text-[#FF80AB]");

        const listIcon = listBtn.querySelector("svg");
        listBtn.classList.remove("bg-[#40C4FF]");
        listIcon.classList.remove("text-white");
        listIcon.classList.add("text-[#40C4FF]");

        window.hideTooltip?.();
    }

    window.resetUI = resetUI;

    feedBtn.onclick = function() {
        const isOpen = !feedContainer.classList.contains("-translate-x-full");
        resetUI();
        
        if (!isOpen) {
            feedContainer.classList.remove("-translate-x-full", "pointer-events-none");
            feedBtn.classList.add("bg-[#FF80AB]");
            feedBtn.querySelector("svg").classList.add("text-white");
        }
    };

    listBtn.onclick = function() {
        const isOpen = !listContainer.classList.contains("translate-x-full");
        resetUI();
        
        if (!isOpen) {
            listContainer.classList.remove("translate-x-full", "pointer-events-none");
            listBtn.classList.add("bg-[#40C4FF]");
            listBtn.querySelector("svg").classList.add("text-white");
        }
    };

    if (heartBtn) {
        heartBtn.onclick = function() {
            const settingsContainer = document.getElementById("settings-container");
            const isAnyFrameOpen =
                !feedContainer.classList.contains("-translate-x-full") ||
                !listContainer.classList.contains("translate-x-full") ||
                (profileContainer && !profileContainer.classList.contains("translate-x-full")) ||
                (settingsContainer && !settingsContainer.classList.contains("-translate-x-full"));

            if (!isAnyFrameOpen) {
                window.centerOnUser?.();
            } else {
                resetUI();
            }
        };
    }

    if (userBtn && profileContainer) {
        userBtn.onclick = function() {
            const isOpen = !profileContainer.classList.contains("translate-x-full");
            resetUI();
            
            if (!isOpen) {
                profileContainer.classList.remove("translate-x-full", "pointer-events-none");
            }
        };
    }

    if (refreshBtn) {
        refreshBtn.onclick = function() {
            localStorage.clear();
            window.location.reload();
        };
    }
}