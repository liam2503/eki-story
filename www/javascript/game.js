function initButtons() {
    const feedBtn    = document.getElementById("icon-shell-0");
    const heartBtn   = document.getElementById("icon-shell-1");
    const listBtn    = document.getElementById("icon-shell-2");
    const stampsBtn  = document.getElementById("icon-shell-3");
    const trainsBtn  = document.getElementById("icon-shell-4");

    const feedContainer   = document.getElementById("feed-container");
    const listContainer   = document.getElementById("list-container");
    const stampsContainer = document.getElementById("stamps-container");
    const trainsContainer = document.getElementById("trains-container");

    if (!feedBtn || !listBtn) return;

    function resetUI() {
        [feedContainer, listContainer, stampsContainer, trainsContainer].forEach(c => {
            if (c) c.classList.add("hidden");
        });

        const resetBtn = (btn, color) => {
            if (!btn) return;
            btn.classList.remove(color);
            const svg = btn.querySelector("svg");
            if (svg) {
                svg.classList.remove("text-white");
                svg.classList.add(color.replace("bg-", "text-"));
            }
        };

        resetBtn(feedBtn,   "bg-[#2BAAE2]");
        resetBtn(listBtn,   "bg-[#fbb03c]");
        resetBtn(stampsBtn, "bg-[#f59e0b]");
        resetBtn(trainsBtn, "bg-[#8b5cf6]");
    }

    function togglePanel(container, btn, bgColor, textColor) {
        const currentlyHidden = container.classList.contains("hidden");
        resetUI();
        if (currentlyHidden) {
            container.classList.remove("hidden");
            btn.classList.add(bgColor);
            const svg = btn.querySelector("svg");
            if (svg) {
                svg.classList.remove(textColor);
                svg.classList.add("text-white");
            }
        }
    }

    feedBtn.onclick   = () => togglePanel(feedContainer,   feedBtn,   "bg-[#2BAAE2]", "text-[#2BAAE2]");
    listBtn.onclick   = () => togglePanel(listContainer,   listBtn,   "bg-[#fbb03c]", "text-[#fbb03c]");
    if (stampsBtn) stampsBtn.onclick = () => togglePanel(stampsContainer, stampsBtn, "bg-[#f59e0b]", "text-[#f59e0b]");
    if (trainsBtn) trainsBtn.onclick = () => togglePanel(trainsContainer, trainsBtn, "bg-[#8b5cf6]", "text-[#8b5cf6]");
    if (heartBtn)  heartBtn.onclick  = resetUI;
}

window.openStationModal = function(name) {
    document.getElementById("modal-station-name").textContent = name;
    document.getElementById("modal-date").value = new Date().toISOString().split("T")[0];
    document.getElementById("modal-note").value = "";
    document.getElementById("modal-public").checked = false;
    document.getElementById("station-modal").classList.remove("hidden");
};

window.closeModal = function() {
    document.getElementById("station-modal").classList.add("hidden");
};

window.submitVisit = function() {
    document.getElementById("station-modal").classList.add("hidden");
};

document.addEventListener("DOMContentLoaded", initButtons);
document.addEventListener("turbo:load", initButtons);
document.addEventListener("turbo:frame-load", initButtons);
