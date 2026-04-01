import { getLanguage, t } from './i18n.js';

export let polylines = [];
export const polylinesByLine = {};

export function renderPolylines(map, allJoins, stationLookup, lineColors, showTooltip) {
    const currentZoom = map.getZoom();
    const lineStroke = Math.max(6, currentZoom * 0.6);
    const hoverStroke = lineStroke * 1.5;

    const segmentGroups = {};

    allJoins.forEach(join => {
        const s1 = stationLookup[String(join.station_id1)];
        const s2 = stationLookup[String(join.station_id2)];
        if (s1 && s2) {
            const round = (val) => Number(val).toFixed(4);
            const key1 = `${round(s1.displayLat)}_${round(s1.displayLon)}`;
            const key2 = `${round(s2.displayLat)}_${round(s2.displayLon)}`;
            
            const segKey = key1 < key2 ? `${key1}-${key2}` : `${key2}-${key1}`;

            if (!segmentGroups[segKey]) segmentGroups[segKey] = [];
            segmentGroups[segKey].push({ join, s1, s2, isReversed: key1 > key2 });
        }
    });

    Object.values(segmentGroups).forEach(group => {
        group.sort((a, b) => String(a.join.line_id).localeCompare(String(b.join.line_id)));

        const count = group.length;
        const offsetGap = 0.00018; 

        group.forEach((item, index) => {
            const { join, s1, s2, isReversed } = item;
            const lineKey = String(join.line_id);
            const lineData = lineColors[lineKey];
            const strokeColor = lineData?.color || "#000000";

            const lat1 = Number(s1.displayLat);
            const lon1 = Number(s1.displayLon);
            const lat2 = Number(s2.displayLat);
            const lon2 = Number(s2.displayLon);

            const dy = lat2 - lat1;
            const dx = (lon2 - lon1) * Math.cos(lat1 * Math.PI / 180); 
            const angle = Math.atan2(dy, dx);

            const orthoAngle = angle + (Math.PI / 2);

            const offsetMultiplier = index - ((count - 1) / 2);
            let actualOffset = offsetMultiplier * offsetGap;
            
            if (isReversed) actualOffset = -actualOffset; 

            const offsetLat = Math.sin(orthoAngle) * actualOffset;
            const offsetLon = (Math.cos(orthoAngle) * actualOffset) / Math.cos(lat1 * Math.PI / 180);

            const polyline = new google.maps.Polyline({
                path: [
                    { lat: lat1 + offsetLat, lng: lon1 + offsetLon }, 
                    { lat: lat2 + offsetLat, lng: lon2 + offsetLon }
                ],
                geodesic: true,
                strokeColor: strokeColor,
                strokeOpacity: 1.0,
                strokeWeight: lineStroke,
                zIndex: index + 10,
                map: map
            });

            polyline.addListener('mouseover', () => polyline.setOptions({ strokeWeight: hoverStroke, zIndex: 99999 }));
            
            polyline.addListener('mouseout', () => {
                const activeZoom = map.getZoom();
                polyline.setOptions({ strokeWeight: Math.max(6, activeZoom * 0.6), zIndex: index + 10 });
            });
            
            polyline.addListener('click', (e) => {
                const stationsOnLine = window.allStations.filter(s => String(s.line_id) === lineKey);
                const visitedCount = stationsOnLine.filter(s => window.isVisited?.(s.id)).length;
                const totalCount = lineData?.total_stations || stationsOnLine.length;
                
                const lang = getLanguage();
                const lineName = lang === 'ja' ? (lineData?.name_jp || lineData?.name_en) : (lineData?.name_en || lineData?.name_jp);

                showTooltip(e.latLng, {
                    stationName: lineName || t('common.unknown'),
                    color: lineData?.color || "#000000",
                    visitedCount: visitedCount,
                    totalCount: totalCount,
                    lineId: lineKey
                }, 'line');
            });
            
            if (!polylinesByLine[lineKey]) polylinesByLine[lineKey] = [];
            polylinesByLine[lineKey].push(polyline);
            polylines.push(polyline);
        });
    });
}