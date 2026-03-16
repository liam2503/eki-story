import { db } from './firebase.js';
import { doc, onSnapshot, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore'; // Added updateDoc and arrayUnion

export const CURRENT_USER_ID = "liam_test_user";
export let visitedStations = []; 

export function isVisited(stationId) {
    return visitedStations.includes(String(stationId));
}

export async function toggleStation(stationId) {
    if (!stationId) return;
    
    const userRef = doc(db, 'users', CURRENT_USER_ID);
    const isAlreadyVisited = isVisited(stationId); // Uses your existing check

    if (isAlreadyVisited) {
        // Relock: Remove from the array
        await setDoc(userRef, {
            visited_stations: arrayRemove(String(stationId))
        }, { merge: true });
    } else {
        // Unlock: Add to the array
        await setDoc(userRef, {
            visited_stations: arrayUnion(String(stationId))
        }, { merge: true });
    }
}

export function initProfileSync() {
    const userRef = doc(db, 'users', CURRENT_USER_ID);
    onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            visitedStations = data.visited_stations || [];
            
            // Re-render markers and tooltips to show the unlock instantly
            if (window.renderVisibleMarkers) window.renderVisibleMarkers();
            
            const streakEl = document.querySelector('#profile-container span.text-2xl:nth-of-type(1)');
            const alertsEl = document.querySelector('#profile-container span.text-2xl:nth-of-type(2)');
            if (streakEl) streakEl.innerText = `${data.streak || 0}d`;
            if (alertsEl) alertsEl.innerText = data.alerts || 0;
        }
    });
}