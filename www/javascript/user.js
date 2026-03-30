import { db } from './firebase.js';
import { doc, collection, onSnapshot, setDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { playConfirmSound } from './audio.js';

export let CURRENT_USER_ID = null;
export let CURRENT_USERNAME = "Guest";
export let IS_ANONYMOUS = false;

export function setCurrentUser(id, username, isAnon) {
    CURRENT_USER_ID = id;
    CURRENT_USERNAME = username;
    IS_ANONYMOUS = isAnon;
}

export let visitedStations = []; 
export const userStamps = {};
export const userStampOriginals = {}; 
export const userStampDates = {};
export const userModels = {};

export function getVisitedStations() {
    return visitedStations;
}

export function isVisited(stationId) {
    return visitedStations.includes(String(stationId));
}

export async function toggleStation(stationId) {
    if (!stationId || !CURRENT_USER_ID) return;
    const userRef = doc(db, 'users', CURRENT_USER_ID);
    const isAlreadyVisited = isVisited(stationId);

    if (isAlreadyVisited) {
        await setDoc(userRef, { visited_stations: arrayRemove(String(stationId)) }, { merge: true });
    } else {
        await setDoc(userRef, { visited_stations: arrayUnion(String(stationId)) }, { merge: true });
        playConfirmSound();
    }
}

export async function saveStamp(id, b64, originalB64, customTimestamp) {
    if (!id || !CURRENT_USER_ID) return;
    const stampRef = doc(db, 'users', CURRENT_USER_ID, 'stamps', String(id));
    const data = { image: b64, timestamp: customTimestamp || Date.now() };
    if (originalB64) data.original = originalB64;
    await setDoc(stampRef, data);
}

export async function deleteStamp(id) {
    if (!id || !CURRENT_USER_ID) return;
    const stampRef = doc(db, 'users', CURRENT_USER_ID, 'stamps', String(id));
    await deleteDoc(stampRef);
}

export async function saveModel(lineId, b64, modelName, customTimestamp, existingId = null) {
    if (!lineId || !CURRENT_USER_ID) return;
    const modelId = existingId || Date.now().toString();
    const modelRef = doc(db, 'users', CURRENT_USER_ID, 'models', modelId);
    await setDoc(modelRef, { 
        line_id: String(lineId), 
        image: b64, 
        name: modelName || "Unknown Model",
        timestamp: customTimestamp || Date.now() 
    });
}

export async function deleteModel(id) {
    if (!id || !CURRENT_USER_ID) return;
    const modelRef = doc(db, 'users', CURRENT_USER_ID, 'models', String(id));
    await deleteDoc(modelRef);
}

export async function updateUserSetting(key, value) {
    if (!CURRENT_USER_ID || IS_ANONYMOUS) return;
    const userRef = doc(db, 'users', CURRENT_USER_ID);
    await setDoc(userRef, { settings: { [key]: value } }, { merge: true });
}

export function initProfileSync() {
    if (!CURRENT_USER_ID) return;
    
    onSnapshot(doc(db, 'users', CURRENT_USER_ID), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            visitedStations = data.visited_stations || [];
            
            if (data.settings) {
                if (data.settings['eki-dark-mode'] !== undefined) localStorage.setItem('eki-dark-mode', data.settings['eki-dark-mode']);
                if (data.settings['eki-sound'] !== undefined) localStorage.setItem('eki-sound', data.settings['eki-sound']);
                if (data.settings['eki-decline-requests'] !== undefined) localStorage.setItem('eki-decline-requests', data.settings['eki-decline-requests']);
                window.dispatchEvent(new CustomEvent('settingsSynced'));
            }

            if (window.renderVisibleMarkers) window.renderVisibleMarkers();
            window.dispatchEvent(new CustomEvent('visitedDataUpdated'));
        }
    });

    const stampsRef = collection(db, 'users', CURRENT_USER_ID, 'stamps');
    onSnapshot(stampsRef, (snapshot) => {
        Object.keys(userStamps).forEach(key => delete userStamps[key]);
        Object.keys(userStampOriginals).forEach(key => delete userStampOriginals[key]);
        Object.keys(userStampDates).forEach(key => delete userStampDates[key]);
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            userStamps[doc.id] = data.image;
            if (data.original) userStampOriginals[doc.id] = data.original;
            if (data.timestamp) userStampDates[doc.id] = data.timestamp;
        });
        
        window.dispatchEvent(new CustomEvent('visitedDataUpdated'));
    });

    const modelsRef = collection(db, 'users', CURRENT_USER_ID, 'models');
    onSnapshot(modelsRef, (snapshot) => {
        Object.keys(userModels).forEach(key => delete userModels[key]);
        snapshot.forEach((doc) => {
            userModels[doc.id] = doc.data();
        });
        window.dispatchEvent(new CustomEvent('visitedDataUpdated'));
    });
}