import { db } from './firebase.js';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

export async function syncStationData(configSnap) {
    if (!configSnap) {
        configSnap = await getDoc(doc(db, 'metadata', 'config'));
    }
    const remoteVersion = configSnap.exists() ? configSnap.data().stationVersion : 0;
    const localVersion = localStorage.getItem('stationVersion');
    let localData = localStorage.getItem('stationData');

    if (!localVersion || Number(localVersion) < remoteVersion || !localData) {
        const snapshot = await getDocs(collection(db, 'stations'));
        const stations = [];
        snapshot.forEach(docSnap => {
            stations.push({ id: docSnap.id, ...docSnap.data() });
        });
        localStorage.setItem('stationData', JSON.stringify(stations));
        localStorage.setItem('stationVersion', remoteVersion.toString());
        return stations;
    }
    return JSON.parse(localData);
}

export async function syncLineData(configSnap) {
    if (!configSnap) {
        configSnap = await getDoc(doc(db, 'metadata', 'config'));
    }
    const remoteVersion = configSnap.exists() ? configSnap.data().stationVersion : 0;
    const localVersion = localStorage.getItem('lineVersion');
    let localData = localStorage.getItem('lineData');

    if (!localVersion || Number(localVersion) < remoteVersion || !localData) {
        const snapshot = await getDocs(collection(db, 'lines'));
        const lines = {};
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const colorValue = data.color || data.line_color_c || data.line_color;
            if (colorValue) {
                const colorStr = String(colorValue);
                lines[String(docSnap.id)] = {
                    color: colorStr.startsWith('#') ? colorStr : '#' + colorStr,
                    name_en: data.line_name_en || `Line ${docSnap.id}`,
                    total_stations: data.station_count || 0,
                    company_id: data.company_id || data.company_cd || ""
                };
            }
        });
        localStorage.setItem('lineData', JSON.stringify(lines));
        localStorage.setItem('lineVersion', remoteVersion.toString());
        return lines;
    }
    return JSON.parse(localData);
}

export async function syncJoinData(configSnap) {
    if (!configSnap) {
        configSnap = await getDoc(doc(db, 'metadata', 'config'));
    }
    const remoteVersion = configSnap.exists() ? configSnap.data().stationVersion : 0;
    const localVersion = localStorage.getItem('joinVersion');
    let localData = localStorage.getItem('joinData');

    if (!localVersion || Number(localVersion) < remoteVersion || !localData) {
        const snapshot = await getDocs(collection(db, 'joins'));
        const joins = [];
        snapshot.forEach(docSnap => {
            joins.push({ id: docSnap.id, ...docSnap.data() });
        });
        localStorage.setItem('joinData', JSON.stringify(joins));
        localStorage.setItem('joinVersion', remoteVersion.toString());
        return joins;
    }
    return JSON.parse(localData);
}

export function lightenColor(hex, percent) {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 + (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 + (B < 255 ? (B < 1 ? 0 : B) : 255)).toString(16).slice(1);
}