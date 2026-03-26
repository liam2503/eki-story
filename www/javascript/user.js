import { db } from './firebase.js';
import { doc, collection, onSnapshot, setDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

export const CURRENT_USER_ID = "liam_test_user";
export let visitedStations = []; 
export const userStamps = {};
export const userStampOriginals = {}; 
export const userStampDates = {};

export function isVisited(stationId) {
    return visitedStations.includes(String(stationId));
}

export async function toggleStation(stationId) {
    if (!stationId) return;
    const userRef = doc(db, 'users', CURRENT_USER_ID);
    const isAlreadyVisited = isVisited(stationId);

    if (isAlreadyVisited) {
        await setDoc(userRef, { visited_stations: arrayRemove(String(stationId)) }, { merge: true });
    } else {
        await setDoc(userRef, { visited_stations: arrayUnion(String(stationId)) }, { merge: true });
    }
}

export async function saveStamp(id, b64, originalB64, customTimestamp) {
    if (!id) return;
    const stampRef = doc(db, 'users', CURRENT_USER_ID, 'stamps', String(id));
    const data = { image: b64, timestamp: customTimestamp || Date.now() };
    if (originalB64) data.original = originalB64;
    await setDoc(stampRef, data);
}

export async function deleteStamp(id) {
    if (!id) return;
    const stampRef = doc(db, 'users', CURRENT_USER_ID, 'stamps', String(id));
    await deleteDoc(stampRef);
}

export function initProfileSync() {
    onSnapshot(doc(db, 'users', CURRENT_USER_ID), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            visitedStations = data.visited_stations || [];
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
}