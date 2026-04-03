import { selectors } from './list_state.js';
import { userStamps, userStampOriginals, userStampDates, saveStamp, deleteStamp } from './user.js';
import { loadOpenCV } from './stamp_cv_loader.js';
import { startCamera, stopCamera } from './stamp_camera.js';
import { startCrop, handleCropInput, finalizeWarp } from './stamp_crop.js';
import { setupRefinement, handleRefineDraw, processFinalStamp, applyLiveContrast, triggerUndo, toggleInvert } from './stamp_refine.js';
import { playReturnSound } from './audio.js';
import { t } from './i18n.js';

let currentStationId = null;
let viewingStationId = null;
let isFlipped = false;
let currentTool = 'brush';
let currentOriginalImage = null;

export function initStampUI(refreshCallback) {
    const els = {
        addCont: document.getElementById("add-stamp-container"),
        video: document.getElementById("camera-feed"),
        canvas: document.getElementById("camera-canvas"),
        place: document.getElementById("camera-placeholder"),
        pill: document.getElementById("stamp-station-pill"),
        cropCont: document.getElementById("crop-container"),
        cropCanvas: document.getElementById("crop-canvas"),
        cropWork: document.getElementById("crop-workspace"),
        refineCont: document.getElementById("refinement-container"),
        refineBase: document.getElementById("refine-base-canvas"),
        refineMask: document.getElementById("refine-mask-canvas"),
        refineWork: document.getElementById("refine-workspace"),
        ink: document.getElementById("ink-color-picker"),
        brush: document.getElementById("brush-size"),
        contrast: document.getElementById("stamp-contrast"),
        flip: document.getElementById("tool-flip"),
        invert: document.getElementById("tool-invert"),
        modalCont: document.getElementById("stamp-modal-container"),
        modalImg: document.getElementById("stamp-modal-image"),
        modalDate: document.getElementById("stamp-modal-date"),
        datePicker: document.getElementById("stamp-date-picker")
    };

    const deleteConfirmModal = document.getElementById("delete-confirm-modal");
    const deleteConfirmBox = document.getElementById("delete-confirm-box");

    const captureStampBtn = document.getElementById("capture-stamp-btn");

    function setCaptureEnabled(btn, enabled) {
        btn.disabled = !enabled;
        if (enabled) {
            btn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        } else {
            btn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        }
    }

    selectors.detailStationsList.addEventListener('click', e => {
        const btn = e.target.closest('.add-stamp-btn');
        if (btn) {
            currentStationId = String(btn.dataset.stationId);
            els.pill.innerText = btn.dataset.stationName;
            els.pill.style.backgroundColor = btn.dataset.lineColor;
            els.addCont.classList.remove("translate-y-full", "pointer-events-none");
            setCaptureEnabled(captureStampBtn, true);
            startCamera(els.video, els.place, loadOpenCV).then(stream => {
                setCaptureEnabled(captureStampBtn, !!stream);
            });
            return;
        }
        
        const prev = e.target.closest('.stamp-image-preview');
        if (prev) {
            e.preventDefault();
            e.stopPropagation();
            viewingStationId = String(prev.dataset.stationId);
            const stampData = userStamps[viewingStationId];
            if (stampData) {
                els.modalImg.src = stampData;
                
                if (els.modalDate) {
                    const ts = userStampDates[viewingStationId];
                    if (ts) {
                        const d = new Date(ts);
                        els.modalDate.innerText = `${t('book.dateStamped')} ${d.toLocaleDateString()}`;
                    } else {
                        els.modalDate.innerText = "";
                    }
                }

                els.modalCont.classList.remove('opacity-0', 'pointer-events-none');
            }
        }
    });

    document.getElementById("capture-stamp-btn").onclick = () => {
        els.canvas.width = els.video.videoWidth; 
        els.canvas.height = els.video.videoHeight;
        els.canvas.getContext('2d').drawImage(els.video, 0, 0);
        const url = els.canvas.toDataURL('image/jpeg', 0.8);
        stopCamera(els.video, els.place);
        els.addCont.classList.add("translate-y-full", "pointer-events-none");
        startCrop(url, els.cropWork, els.cropCanvas);
    };

    document.getElementById("upload-stamp-input").onchange = (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            stopCamera(els.video, els.place);
            els.addCont.classList.add("translate-y-full", "pointer-events-none");
            startCrop(event.target.result, els.cropWork, els.cropCanvas);
            e.target.value = '';
        };
        reader.readAsDataURL(file);
    };

    els.cropCanvas.onmousedown = (e) => handleCropInput(e, els.cropCanvas, 'down');
    els.cropCanvas.ontouchstart = (e) => handleCropInput(e, els.cropCanvas, 'down');
    window.addEventListener('mousemove', (e) => handleCropInput(e, els.cropCanvas, 'move'));
    window.addEventListener('touchmove', (e) => handleCropInput(e, els.cropCanvas, 'move'), { passive: false });
    window.addEventListener('mouseup', () => handleCropInput(null, null, 'up'));
    window.addEventListener('touchend', () => handleCropInput(null, null, 'up'));

    els.contrast.addEventListener('input', (e) => {
        applyLiveContrast(els.refineMask, e.target.value);
    });

    document.getElementById("confirm-crop-btn").onclick = () => {
        if (!window.isCVModelLoaded) return;
        const warped = finalizeWarp(els.cropCanvas);
        currentOriginalImage = warped;
        els.cropCont.classList.add('translate-y-full', 'pointer-events-none');
        
        els.datePicker.value = new Date(Date.now() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        
        setupRefinement(warped, els.refineBase, els.refineMask, els.refineWork);
    };

    els.refineMask.onmousedown = (e) => handleRefineDraw(e, els.refineMask, currentTool, els.brush.value, 'start', isFlipped);
    els.refineMask.ontouchstart = (e) => handleRefineDraw(e, els.refineMask, currentTool, els.brush.value, 'start', isFlipped);
    els.refineMask.onmousemove = (e) => handleRefineDraw(e, els.refineMask, currentTool, els.brush.value, 'move', isFlipped);
    els.refineMask.addEventListener('touchmove', (e) => handleRefineDraw(e, els.refineMask, currentTool, els.brush.value, 'move', isFlipped), { passive: false });
    window.addEventListener('mouseup', () => handleRefineDraw(null, null, null, null, 'stop', isFlipped));
    window.addEventListener('touchend', () => handleRefineDraw(null, null, null, null, 'stop', isFlipped));

    document.getElementById("tool-brush").onclick = () => { currentTool = 'brush'; document.getElementById("tool-brush").classList.add('border-white'); document.getElementById("tool-erase").classList.remove('border-white'); };
    document.getElementById("tool-erase").onclick = () => { currentTool = 'erase'; document.getElementById("tool-erase").classList.add('border-white'); document.getElementById("tool-brush").classList.remove('border-white'); };
    els.flip.onclick = () => { isFlipped = !isFlipped; els.refineBase.style.transform = els.refineMask.style.transform = `scaleX(${isFlipped ? -1 : 1})`; };
    document.getElementById("tool-undo").onclick = () => {
        triggerUndo(els.refineMask, els.contrast.value);
    };
    els.invert.onclick = () => {
        toggleInvert(els.refineMask, els.contrast.value);
    };

    document.getElementById("confirm-refine-btn").onclick = async () => {
        const dateVal = els.datePicker.value;
        let customTs = Date.now();
        if (dateVal) {
            customTs = new Date(dateVal + 'T12:00:00').getTime(); 
        }

        await saveStamp(currentStationId, processFinalStamp(els.refineBase, els.refineMask, els.ink.value, isFlipped), currentOriginalImage, customTs);
        els.refineCont.classList.add('translate-y-full', 'pointer-events-none');
        isFlipped = false; els.refineBase.style.transform = els.refineMask.style.transform = 'scaleX(1)';
        refreshCallback();
    };

    document.getElementById("close-stamp-btn").onclick = () => { els.addCont.classList.add("translate-y-full", "pointer-events-none"); stopCamera(els.video, els.place); };
    
    document.getElementById("cancel-crop-btn").onclick = () => {
        els.cropCont.classList.add("translate-y-full", "pointer-events-none");
    };

    document.getElementById("cancel-refine-btn").onclick = () => {
        els.refineCont.classList.add("translate-y-full", "pointer-events-none");
    };

    document.getElementById("close-stamp-modal").onclick = () => els.modalCont.classList.add('opacity-0', 'pointer-events-none');
    
    document.getElementById("edit-stamp-btn").onclick = () => {
        els.modalCont.classList.add('opacity-0', 'pointer-events-none');
        const stampData = userStamps[viewingStationId];
        const originalData = userStampOriginals[viewingStationId] || stampData; 
        
        if (originalData) {
            currentStationId = viewingStationId;
            currentOriginalImage = originalData;
            
            const ts = userStampDates[viewingStationId];
            if (ts) {
                const d = new Date(ts);
                els.datePicker.value = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            } else {
                els.datePicker.value = new Date(Date.now() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            }

            setupRefinement(originalData, els.refineBase, els.refineMask, els.refineWork);
        }
    };

    document.getElementById("delete-stamp-btn").onclick = () => {
        deleteConfirmModal.classList.remove('opacity-0', 'pointer-events-none');
        deleteConfirmBox.classList.remove('scale-95');
        deleteConfirmBox.classList.add('scale-100');
    };

    document.getElementById("cancel-delete-btn").onclick = () => {
        deleteConfirmModal.classList.add('opacity-0', 'pointer-events-none');
        deleteConfirmBox.classList.add('scale-95');
        deleteConfirmBox.classList.remove('scale-100');
    };

    document.getElementById("confirm-delete-btn").onclick = async () => {
        await deleteStamp(viewingStationId);
        playReturnSound();
        deleteConfirmModal.classList.add('opacity-0', 'pointer-events-none');
        deleteConfirmBox.classList.add('scale-95');
        deleteConfirmBox.classList.remove('scale-100');
        els.modalCont.classList.add('opacity-0', 'pointer-events-none');
        refreshCallback();
    };
}