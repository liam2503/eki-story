export function initButtons() {
    const feedBtn = document.getElementById("icon-shell-0");
    const heartBtn = document.getElementById("icon-shell-1");
    const listBtn = document.getElementById("icon-shell-2");
    const userBtn = document.getElementById("user-shell");
    const addStampBtn = document.getElementById("icon-shell-s");

    const feedContainer = document.getElementById("feed-container");
    const listContainer = document.getElementById("list-container");
    const profileContainer = document.getElementById("profile-container");
    const addStampContainer = document.getElementById("add-stamp-container");
    const closeStampBtn = document.getElementById("close-stamp-btn");

    if (!feedBtn || !listBtn) return;

    function resetUI() {
        feedContainer.classList.add("-translate-x-full", "pointer-events-none");
        listContainer.classList.add("translate-x-full", "pointer-events-none");
        
        if (profileContainer) {
            profileContainer.classList.add("translate-x-full", "pointer-events-none");
        }

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
                profileContainer.classList.remove("translate-x-full", "pointer-events-none");
            }
        };
    }

    if (addStampBtn && addStampContainer && closeStampBtn) {
        addStampBtn.onclick = function() {
            addStampContainer.classList.remove("translate-y-full", "pointer-events-none");
        };

        closeStampBtn.onclick = function() {
            addStampContainer.classList.add("translate-y-full", "pointer-events-none");
        };
    }
}