import { state, selectors } from './list_state.js';
import { userStamps, userStampOriginals, userStampDates, saveStamp, deleteStamp, isVisited, userModels } from './user.js';
import { loadOpenCV } from './stamp_cv_loader.js';
import { startCamera, stopCamera } from './stamp_camera.js';
import { startCrop, handleCropInput, finalizeWarp } from './stamp_crop.js';
import { setupRefinement, handleRefineDraw, processFinalStamp, applyLiveContrast, triggerUndo, toggleInvert } from './stamp_refine.js';
import { playReturnSound, playSlideSound, playOkSound, playCameraSound, playConfirm3Sound } from './audio.js';
import { showToast } from './ui.js';
import { getLanguage, t } from './i18n.js';
import { showPostToFeedPrompt } from './feed.js';

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

let currentStationId = null, currentLineId = null, viewingStationId = null, isFlipped = false, currentTool = 'brush';
let currentOriginalImage = null;

export function getCurrentLineId() {
    return currentLineId;
}

export async function showLineDetail(lineId) {
    if (!lineId) return;
    currentLineId = lineId;
    const line = state.localLines[lineId];
    if (!line) return;
    const stations = state.localStations.filter(s => String(s.line_id) === String(lineId));
    selectors.detailContainer.classList.remove('hidden');

    const visitedCount = stations.filter(s => isVisited(s.id) || userStamps[String(s.id)]).length;
    const totalCount = line.total_stations || stations.length;

    const lang = getLanguage();
    const lineName = lang === 'ja' ? (line.name_jp || line.name_en) : (line.name_en || line.name_jp);

    selectors.detailLineName.innerText = lineName;
    selectors.detailLineName.onclick = () => {
        playSlideSound();
        window.filterToLine?.(lineId);
        
        const panToMid = () => {
            if (stations?.length) {
                const mid = stations[Math.floor(stations.length / 2)];
                window.map.panTo({ lat: Number(mid.lat || mid.displayLat), lng: Number(mid.lon || mid.displayLon) });
                window.map.setZoom(line.zoom || 12);
            }
        };

        if (window.map) {
            panToMid();
        } else {
            window.addEventListener('mapInitialized', panToMid, { once: true });
        }
        
        const filterPill = document.getElementById('active-filter-pill');
        if (filterPill) {
            document.getElementById('active-filter-name').innerText = lineName;
            document.getElementById('active-filter-color').style.backgroundColor = line.color || '#000';
            filterPill.classList.remove('hidden');
        }
        
        selectors.detailContainer.classList.add('translate-x-full');
        window.resetUI?.();
    };
    selectors.detailFraction.innerText = `${visitedCount}/${totalCount}`;
    selectors.detailProgressBar.style.width = `${(visitedCount / totalCount) * 100}%`;
    selectors.detailProgressBar.style.backgroundColor = line.color || 'black';
    selectors.detailTrackLine.style.backgroundColor = line.color || '#4b5563';

    selectors.detailStationsList.innerHTML = stations.map(s => {
        const visited = isVisited(s.id) || userStamps[String(s.id)];
        const stampHtml = userStamps[String(s.id)] ? `<div class="mt-4 mb-2 cursor-pointer stamp-image-preview transition-transform active:scale-95 w-max relative z-10" data-station-id="${s.id}"><img src="${userStamps[String(s.id)]}" class="w-32 h-32 object-cover border-[4px] border-black rounded-[20px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white -rotate-2 pointer-events-none"></div>` : '';
        const stationName = lang === 'ja' ? (s.station_name_jp || s.station_name_en) : (s.station_name_en || s.station_name_jp);
        
        return `<div class="flex items-start gap-6 ml-1 station-item">
            <div class="station-dot w-8 h-8 rounded-full border-[4px] border-black shrink-0 mt-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" style="background-color: ${visited ? '#B2FF59' : '#FFF'}"></div>
            <div class="flex flex-col gap-2 w-full">
<span class="station-name-click cursor-pointer hover:text-gray-500 transition-colors text-xl font-black uppercase tracking-tight pt-2" data-station-id="${s.id}" data-lat="${s.lat || s.displayLat}" data-lon="${s.lon || s.displayLon}">${escapeHtml(stationName)}</span>                <button class="add-stamp-btn bg-white border-[3px] border-black px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all w-max mt-1" data-station-id="${s.id}" data-station-name="${escapeHtml(stationName)}" data-line-color="${line.color || '#B2FF59'}">+ ${t('camera.newStamp')}</button>
                ${stampHtml}
            </div>
        </div>`;
    }).join('');
    
    const tabStations = document.getElementById('tab-stations');
    const tabModels = document.getElementById('tab-models');

    tabStations.className = "flex-1 py-4 text-xs font-black uppercase border-r-[4px] border-black bg-[#B2FF59]";
    tabModels.className = "flex-1 py-4 text-xs font-black uppercase bg-gray-100 text-gray-400";
    selectors.detailStationsList.classList.remove('hidden');
    selectors.detailTrackLine.classList.remove('hidden');
    if (selectors.detailModelsList) selectors.detailModelsList.classList.add('hidden');
    
    tabStations.onclick = () => {
        playSlideSound();
        tabStations.className = "flex-1 py-4 text-xs font-black uppercase border-r-[4px] border-black bg-[#B2FF59]";
        tabModels.className = "flex-1 py-4 text-xs font-black uppercase bg-gray-100 text-gray-400";
        selectors.detailStationsList.classList.remove('hidden');
        selectors.detailTrackLine.classList.remove('hidden');
        if (selectors.detailModelsList) selectors.detailModelsList.classList.add('hidden');
    };

    tabModels.onclick = () => {
        playSlideSound();
        tabModels.className = "flex-1 py-4 text-xs font-black uppercase bg-[#B2FF59]";
        tabStations.className = "flex-1 py-4 text-xs font-black uppercase border-r-[4px] border-black bg-gray-100 text-gray-400";
        selectors.detailStationsList.classList.add('hidden');
        selectors.detailTrackLine.classList.add('hidden');
        if (selectors.detailModelsList) selectors.detailModelsList.classList.remove('hidden');
        renderModelsList(lineId, line, lineName);
    };

    renderModelsList(lineId, line, lineName);

    requestAnimationFrame(() => {
        const dots = selectors.detailStationsList.querySelectorAll('.station-dot');
        if (dots.length > 1) {
            const listTop = selectors.detailStationsList.offsetTop;
            const startY = listTop + dots[0].offsetTop + 16;
            const endY = listTop + dots[dots.length - 1].offsetTop + 16;

            selectors.detailTrackLine.style.top = `${startY}px`;
            selectors.detailTrackLine.style.height = `${endY - startY}px`;
        }
        selectors.detailContainer.classList.remove('translate-x-full');
    });
}

function renderModelsList(lineId, line, localizedLineName) {
    if (!selectors.detailModelsList) return;
    const modelsForLine = Object.entries(userModels || {}).filter(([k, v]) => String(v.line_id) === String(lineId));
    
    let html = `
        <div class="flex flex-col gap-4 w-full">
            <button class="add-model-btn bg-white border-[4px] border-black px-6 py-4 rounded-[20px] text-lg font-black uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all w-full mb-4" data-line-id="${lineId}" data-line-name="${escapeHtml(localizedLineName)}" data-line-color="${line.color || '#B2FF59'}">+ ${t('camera.newModel')}</button>
            <div class="grid grid-cols-2 gap-4">
    `;
    
    modelsForLine.forEach(([modelId, data]) => {
        const modelName = data.name || t('common.unknown');
        html += `
            <div class="cursor-pointer model-image-preview transition-transform active:scale-95 flex flex-col items-center gap-2" data-model-id="${modelId}">
                <img src="${data.image}" class="w-full aspect-square object-cover border-[4px] border-black rounded-[20px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white pointer-events-none">
                <span class="text-[10px] font-black uppercase tracking-tight text-center truncate w-full px-1">${escapeHtml(modelName)}</span>
            </div>
        `;
    });

    html += `</div></div>`;
    selectors.detailModelsList.innerHTML = html;
}

export function initStampScanner() {
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
            playOkSound();
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
            playSlideSound();
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
            return;
        }

        const nameClick = e.target.closest('.station-name-click');
        if (nameClick) {
            playSlideSound();
            const sid = nameClick.dataset.stationId;
            const lat = Number(nameClick.dataset.lat);
            const lon = Number(nameClick.dataset.lon);
            
            const station = state.localStations.find(s => String(s.id) === String(sid));
            const line = state.localLines[currentLineId];

            window.filterToLine?.(currentLineId);
            
            const panToStation = () => {
                window.map.panTo({ lat, lng: lon });
                window.map.setZoom(15);
            };

            if (window.map) {
                panToStation();
            } else {
                window.addEventListener('mapInitialized', panToStation, { once: true });
            }

            const filterPill = document.getElementById('active-filter-pill');
            if (filterPill && line) {
                const lang = getLanguage();
                const localizedLineName = lang === 'ja' ? (line.name_jp || line.name_en) : (line.name_en || line.name_jp);
                document.getElementById('active-filter-name').innerText = localizedLineName;
                document.getElementById('active-filter-color').style.backgroundColor = line.color || '#000';
                filterPill.classList.remove('hidden');
            }
            
            selectors.detailContainer.classList.add('translate-x-full');
            window.resetUI?.();

            if (window.showTooltip && station) {
                const lang = getLanguage();
                const stationName = lang === 'ja' ? (station.station_name_jp || station.station_name_en) : (station.station_name_en || station.station_name_jp);
                const lineName = lang === 'ja' ? (line?.name_jp || line?.name_en) : (line?.name_en || line?.name_jp);
                
                window.showTooltip({ lat, lng: lon }, {
                    stationId: station.id,
                    stationName: stationName || t('common.unknown'),
                    lineName: lineName || `Line ${currentLineId}`,
                    color: line?.color || "#000000",
                    isVisited: isVisited(station.id)
                }, 'station');
            } else {
                setTimeout(() => {
                    import('./map_markers.js').then(({ markers }) => {
                        const markerObj = markers[sid];
                        if (markerObj && markerObj.instance) {
                            google.maps.event.trigger(markerObj.instance, 'gmp-click');
                        }
                    });
                }, 500);
            }
            return;
        }
    });

    const clearFilterBtn = document.getElementById('clear-filter-btn');
    if (clearFilterBtn) {
        clearFilterBtn.onclick = () => {
            document.getElementById('active-filter-pill').classList.add('hidden');
            window.filterToLine?.(""); 
            if (window.map) {
                google.maps.event.trigger(window.map, 'idle');
            }
        };
    }

    document.getElementById("capture-stamp-btn").onclick = () => {
        playCameraSound();
        els.canvas.width = els.video.videoWidth; els.canvas.height = els.video.videoHeight;
        els.canvas.getContext('2d').drawImage(els.video, 0, 0);
        const url = els.canvas.toDataURL('image/jpeg', 0.8);
        stopCamera(els.video, els.place);
        els.addCont.classList.add("translate-y-full", "pointer-events-none");
        startCrop(url, els.cropWork, els.cropCanvas);
    };

    document.getElementById("upload-stamp-input").onchange = (e) => {
        const file = e.target.files[0]; if (!file) return;
        playCameraSound();
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
        playOkSound();
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

    document.getElementById("tool-brush").onclick = () => { playOkSound(); currentTool = 'brush'; document.getElementById("tool-brush").classList.add('border-white'); document.getElementById("tool-erase").classList.remove('border-white'); };
    document.getElementById("tool-erase").onclick = () => { playOkSound(); currentTool = 'erase'; document.getElementById("tool-erase").classList.add('border-white'); document.getElementById("tool-brush").classList.remove('border-white'); };
    els.flip.onclick = () => { playOkSound(); isFlipped = !isFlipped; els.refineBase.style.transform = els.refineMask.style.transform = `scaleX(${isFlipped ? -1 : 1})`; };
    document.getElementById("tool-undo").onclick = () => {
        playOkSound();
        triggerUndo(els.refineMask, els.contrast.value);
    };
    els.invert.onclick = () => {
        playOkSound();
        toggleInvert(els.refineMask, els.contrast.value);
    };

    document.getElementById("confirm-refine-btn").onclick = async () => {
        playConfirm3Sound();
        const dateVal = els.datePicker.value;
        let customTs = Date.now();
        if (dateVal) {
            customTs = new Date(dateVal + 'T12:00:00').getTime(); 
        }

        const processedImage = processFinalStamp(els.refineBase, els.refineMask, els.ink.value, isFlipped);
        try {
            await saveStamp(currentStationId, processedImage, currentOriginalImage, customTs);
            els.refineCont.classList.add('translate-y-full', 'pointer-events-none');
            isFlipped = false; els.refineBase.style.transform = els.refineMask.style.transform = 'scaleX(1)';
            showLineDetail(currentLineId);
            showPostToFeedPrompt(processedImage, 'stamp');
        } catch (e) {
            showToast('Failed to save stamp. Please try again.');
        }
    };

    document.getElementById("close-stamp-btn").onclick = () => { playReturnSound(); els.addCont.classList.add("translate-y-full", "pointer-events-none"); stopCamera(els.video, els.place); };
    
    document.getElementById("cancel-crop-btn").onclick = () => {
        playReturnSound();
        els.cropCont.classList.add("translate-y-full", "pointer-events-none");
    };

    document.getElementById("cancel-refine-btn").onclick = () => {
        playReturnSound();
        els.refineCont.classList.add("translate-y-full", "pointer-events-none");
    };

    document.getElementById("close-stamp-modal").onclick = () => { playReturnSound(); els.modalCont.classList.add('opacity-0', 'pointer-events-none'); };
    
    document.getElementById("edit-stamp-btn").onclick = () => {
        playOkSound();
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
        playOkSound();
        deleteConfirmModal.classList.remove('opacity-0', 'pointer-events-none');
        deleteConfirmBox.classList.remove('scale-95');
        deleteConfirmBox.classList.add('scale-100');
    };

    document.getElementById("cancel-delete-btn").onclick = () => {
        playReturnSound();
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
        showLineDetail(currentLineId);
    };
}