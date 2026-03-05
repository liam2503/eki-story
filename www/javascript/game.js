function initButtons() {
    const feedBtn = document.getElementById("icon-shell-0");
    const heartBtn = document.getElementById("icon-shell-1");
    const listBtn = document.getElementById("icon-shell-2");
    
    const feedContainer = document.getElementById("feed-container");
    const listContainer = document.getElementById("list-container");

    if (!feedBtn || !listBtn) return;

    function resetUI() {
        feedContainer.classList.add("hidden");
        listContainer.classList.add("hidden");

        const feedIcon = feedBtn.querySelector("svg");
        feedBtn.classList.remove("bg-[#2BAAE2]");
        feedIcon.classList.remove("text-white");
        feedIcon.classList.add("text-[#2BAAE2]");

        const listIcon = listBtn.querySelector("svg");
        listBtn.classList.remove("bg-[#fbb03c]");
        listIcon.classList.remove("text-white");
        listIcon.classList.add("text-[#fbb03c]");
    }

    feedBtn.onclick = function() {
        const currentlyHidden = feedContainer.classList.contains("hidden");
        resetUI();
        
        if (currentlyHidden) {
            feedContainer.classList.remove("hidden");
            feedBtn.classList.add("bg-[#2BAAE2]");
            feedBtn.querySelector("svg").classList.add("text-white");
        }
    };

    listBtn.onclick = function() {
        const currentlyHidden = listContainer.classList.contains("hidden");
        resetUI();
        
        if (currentlyHidden) {
            listContainer.classList.remove("hidden");
            listBtn.classList.add("bg-[#fbb03c]");
            listBtn.querySelector("svg").classList.add("text-white");
        }
    };

    if (heartBtn) {
        heartBtn.onclick = resetUI;
    }
}

document.addEventListener("DOMContentLoaded", initButtons);
document.addEventListener("turbo:load", initButtons);
document.addEventListener("turbo:frame-load", initButtons);