import { selectors } from './list_state.js';
import { userModels, saveModel, deleteModel } from './user.js';
import { startCamera, stopCamera } from './stamp_camera.js';
import { playReturnSound } from './audio.js';
import { showPostToFeedPrompt } from './feed.js';

let viewingModelId = null;
let currentLineId = null;
let pendingModelImageData = null;
let editingModelId = null;

export function initModelUI(refreshCallback) {
    const modelEls = {
        addCont: document.getElementById("add-model-container"),
        video: document.getElementById("model-camera-feed"),
        previewImg: document.getElementById("model-preview-image"),
        canvas: document.getElementById("model-camera-canvas"),
        place: document.getElementById("model-camera-placeholder"),
        pill: document.getElementById("model-line-pill"),
        nameInput: document.getElementById("model-name-input"),
        datePicker: document.getElementById("model-date-picker"),
        captureActions: document.getElementById("model-capture-actions"),
        saveActions: document.getElementById("model-save-actions"),
        modalCont: document.getElementById("model-modal-container"),
        modalImg: document.getElementById("model-modal-image"),
        modalName: document.getElementById("model-modal-name"),
        modalDate: document.getElementById("model-modal-date")
    };

    const deleteModelConfirmModal = document.getElementById("delete-model-confirm-modal");
    const deleteModelConfirmBox = document.getElementById("delete-model-confirm-box");

    if (selectors.detailModelsList) {
        selectors.detailModelsList.addEventListener('click', e => {
            const addModelBtn = e.target.closest('.add-model-btn');
            if (addModelBtn) {
                currentLineId = String(addModelBtn.dataset.lineId);
                editingModelId = null;
                modelEls.pill.innerText = addModelBtn.dataset.lineName;
                modelEls.pill.style.backgroundColor = addModelBtn.dataset.lineColor;
                modelEls.nameInput.value = ''; 
                modelEls.datePicker.value = new Date(Date.now() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                
                modelEls.previewImg.classList.add('hidden');
                modelEls.previewImg.src = '';
                modelEls.captureActions.classList.remove('hidden');
                modelEls.saveActions.classList.add('hidden');
                pendingModelImageData = null;

                modelEls.addCont.classList.remove("translate-y-full", "pointer-events-none");
                startCamera(modelEls.video, modelEls.place, async () => {});
                return;
            }

            const modelPrev = e.target.closest('.model-image-preview');
            if (modelPrev) {
                e.preventDefault();
                e.stopPropagation();
                viewingModelId = String(modelPrev.dataset.modelId);
                const modelData = userModels[viewingModelId];
                if (modelData) {
                    modelEls.modalImg.src = modelData.image;
                    if (modelEls.modalName) {
                        modelEls.modalName.innerText = modelData.name || "Unknown Model";
                    }
                    if (modelEls.modalDate && modelData.timestamp) {
                        const d = new Date(modelData.timestamp);
                        modelEls.modalDate.innerText = `Date Added: ${d.toLocaleDateString()}`;
                    } else if (modelEls.modalDate) {
                        modelEls.modalDate.innerText = "";
                    }
                    modelEls.modalCont.classList.remove('opacity-0', 'pointer-events-none');
                }
            }
        });
    }

    document.getElementById("capture-model-btn").onclick = async () => {
        modelEls.canvas.width = modelEls.video.videoWidth; 
        modelEls.canvas.height = modelEls.video.videoHeight;
        modelEls.canvas.getContext('2d').drawImage(modelEls.video, 0, 0);
        
        const outCanvas = resizeCanvasImage(modelEls.canvas, 800);
        pendingModelImageData = outCanvas.toDataURL('image/jpeg', 0.8);
        
        stopCamera(modelEls.video, modelEls.place);
        
        modelEls.previewImg.src = pendingModelImageData;
        modelEls.previewImg.classList.remove('hidden');
        modelEls.captureActions.classList.add('hidden');
        modelEls.saveActions.classList.remove('hidden');
    };

    document.getElementById("upload-model-input").onchange = (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            stopCamera(modelEls.video, modelEls.place);
            
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width; canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                const outCanvas = resizeCanvasImage(canvas, 800);
                
                pendingModelImageData = outCanvas.toDataURL('image/jpeg', 0.8);
                
                modelEls.previewImg.src = pendingModelImageData;
                modelEls.previewImg.classList.remove('hidden');
                modelEls.captureActions.classList.add('hidden');
                modelEls.saveActions.classList.remove('hidden');
            };
            img.src = event.target.result;
            e.target.value = '';
        };
        reader.readAsDataURL(file);
    };

    document.getElementById("retake-model-btn").onclick = () => {
        pendingModelImageData = null;
        modelEls.previewImg.classList.add('hidden');
        modelEls.previewImg.src = '';
        modelEls.captureActions.classList.remove('hidden');
        modelEls.saveActions.classList.add('hidden');
        startCamera(modelEls.video, modelEls.place, async () => {});
    };

    document.getElementById("save-model-btn").onclick = async () => {
        if (!pendingModelImageData) return;
        const modelName = modelEls.nameInput.value.trim();
        
        const dateVal = modelEls.datePicker.value;
        let customTs = Date.now();
        if (dateVal) {
            customTs = new Date(dateVal + 'T12:00:00').getTime(); 
        }
        
        const savedImage = pendingModelImageData;
        modelEls.addCont.classList.add("translate-y-full", "pointer-events-none");
        await saveModel(currentLineId, savedImage, modelName, customTs, editingModelId);
        refreshCallback();
        showPostToFeedPrompt(savedImage, 'model');
    };

    document.getElementById("edit-model-btn").onclick = () => {
        modelEls.modalCont.classList.add('opacity-0', 'pointer-events-none');
        
        const modelData = userModels[viewingModelId];
        if (modelData) {
            currentLineId = modelData.line_id;
            editingModelId = viewingModelId;
            pendingModelImageData = modelData.image;

            modelEls.pill.innerText = "Edit Model";
            modelEls.pill.style.backgroundColor = "#B2FF59";
            modelEls.nameInput.value = modelData.name || "";
            
            if (modelData.timestamp) {
                const d = new Date(modelData.timestamp);
                modelEls.datePicker.value = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            } else {
                modelEls.datePicker.value = new Date(Date.now() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            }

            modelEls.previewImg.src = pendingModelImageData;
            modelEls.previewImg.classList.remove('hidden');
            modelEls.captureActions.classList.add('hidden');
            modelEls.saveActions.classList.remove('hidden');
            
            modelEls.addCont.classList.remove("translate-y-full", "pointer-events-none");
        }
    };

    document.getElementById("close-model-btn").onclick = () => {
        modelEls.addCont.classList.add("translate-y-full", "pointer-events-none");
        stopCamera(modelEls.video, modelEls.place);
    };

    document.getElementById("close-model-modal").onclick = () => {
        modelEls.modalCont.classList.add('opacity-0', 'pointer-events-none');
    };

    document.getElementById("delete-model-btn").onclick = () => {
        deleteModelConfirmModal.classList.remove('opacity-0', 'pointer-events-none');
        deleteModelConfirmBox.classList.remove('scale-95');
        deleteModelConfirmBox.classList.add('scale-100');
    };

    document.getElementById("cancel-delete-model-btn").onclick = () => {
        deleteModelConfirmModal.classList.add('opacity-0', 'pointer-events-none');
        deleteModelConfirmBox.classList.add('scale-95');
        deleteModelConfirmBox.classList.remove('scale-100');
    };

    document.getElementById("confirm-delete-model-btn").onclick = async () => {
        await deleteModel(viewingModelId);
        playReturnSound();
        deleteModelConfirmModal.classList.add('opacity-0', 'pointer-events-none');
        deleteModelConfirmBox.classList.add('scale-95');
        deleteModelConfirmBox.classList.remove('scale-100');
        modelEls.modalCont.classList.add('opacity-0', 'pointer-events-none');
        refreshCallback();
    };

    function resizeCanvasImage(canvas, maxSize) {
        if (canvas.width > maxSize || canvas.height > maxSize) {
            const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height);
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = canvas.width * scale;
            finalCanvas.height = canvas.height * scale;
            const ctx = finalCanvas.getContext('2d');
            ctx.drawImage(canvas, 0, 0, finalCanvas.width, finalCanvas.height);
            return finalCanvas;
        }
        return canvas;
    }
}