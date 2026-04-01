import { db } from './firebase.js';
import { collection, getDocs } from 'firebase/firestore';

export async function syncStationData() {
    const snapshot = await getDocs(collection(db, 'stations'));
    const stations = [];
    snapshot.forEach(docSnap => {
        stations.push({ id: docSnap.id, ...docSnap.data() });
    });
    return stations;
}

export async function syncLineData() {
    const snapshot = await getDocs(collection(db, 'lines'));
    const lines = {};
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const colorValue = data.color || data.line_color_c || data.line_color;
        if (colorValue) {
            const colorStr = String(colorValue);
            lines[String(docSnap.id)] = {
                color: colorStr.startsWith('#') ? colorStr : '#' + colorStr,
                name_en: data.line_name_en || data.name_en || `Line ${docSnap.id}`,
                name_jp: data.line_name_jp || data.name_jp || data.line_name_en || data.name_en || `Line ${docSnap.id}`,
                total_stations: data.station_count || data.total_stations || 0,
                company_id: data.company_id || data.company_cd || ""
            };
        }
    });
    return lines;
}

export async function syncJoinData() {
    const snapshot = await getDocs(collection(db, 'joins'));
    const joins = [];
    snapshot.forEach(docSnap => {
        joins.push({ id: docSnap.id, ...docSnap.data() });
    });
    return joins;
}

export function lightenColor(hex, percent) {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 + (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 + (B < 255 ? (B < 1 ? 0 : B) : 255)).toString(16).slice(1);
}