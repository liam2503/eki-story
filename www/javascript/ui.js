export function initButtons() {
    const feedBtn = document.getElementById("icon-shell-0");
    const heartBtn = document.getElementById("icon-shell-1");
    const listBtn = document.getElementById("icon-shell-2");
    const userBtn = document.getElementById("user-shell");

    const feedContainer = document.getElementById("feed-container");
    const listContainer = document.getElementById("list-container");
    const profileContainer = document.getElementById("profile-container");
    const topBar = document.getElementById("top-bar");
    const refreshBtnEl = document.getElementById("refresh-db");

    if (!feedBtn || !listBtn) return;

    function showTopBar() {
        if (topBar) topBar.classList.remove('hidden');
        if (refreshBtnEl) refreshBtnEl.classList.remove('hidden');
    }

    function hideTopBar() {
        if (topBar) topBar.classList.add('hidden');
        if (refreshBtnEl) refreshBtnEl.classList.add('hidden');
    }

    function resetUI() {
        feedContainer.classList.add("-translate-x-full");
        feedContainer.classList.add("pointer-events-none");
        listContainer.classList.add("translate-x-full");
        listContainer.classList.add("pointer-events-none");
        if (profileContainer) {
            profileContainer.classList.add("translate-x-full");
            profileContainer.classList.add("pointer-events-none");
        }
        showTopBar();

        const feedIcon = feedBtn.querySelector("svg");
        feedBtn.classList.remove("bg-[#FF80AB]");
        feedIcon.classList.remove("text-white");
        feedIcon.classList.add("text-[#FF80AB]");

        const listIcon = listBtn.querySelector("svg");
        listBtn.classList.remove("bg-[#40C4FF]");
        listIcon.classList.remove("text-white");
        listIcon.classList.add("text-[#40C4FF]");
    }

    window.resetUI = resetUI;

    feedBtn.onclick = function() {
        const isOpen = !feedContainer.classList.contains("-translate-x-full");
        resetUI();
        if (!isOpen) {
            feedContainer.classList.remove("-translate-x-full");
            feedContainer.classList.remove("pointer-events-none");
            feedBtn.classList.add("bg-[#FF80AB]");
            feedBtn.querySelector("svg").classList.add("text-white");
            hideTopBar();
        }
    };

    listBtn.onclick = function() {
        const isOpen = !listContainer.classList.contains("translate-x-full");
        resetUI();
        if (!isOpen) {
            listContainer.classList.remove("translate-x-full");
            listContainer.classList.remove("pointer-events-none");
            listBtn.classList.add("bg-[#40C4FF]");
            listBtn.querySelector("svg").classList.add("text-white");
            hideTopBar();
        }
    };

    if (heartBtn) {
        heartBtn.onclick = function() {
            const isAnyFrameOpen = 
                !feedContainer.classList.contains("-translate-x-full") || 
                !listContainer.classList.contains("translate-x-full") || 
                (profileContainer && !profileContainer.classList.contains("translate-x-full"));

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
                profileContainer.classList.remove("translate-x-full");
                profileContainer.classList.remove("pointer-events-none");
                hideTopBar();
            }
        };
    }
}