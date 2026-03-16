export let polylines = [];
export const polylinesByLine = {};

export function renderPolylines(map, allJoins, stationLookup, lineColors, showTooltip) {
    const currentZoom = map.getZoom();
    const lineStroke = Math.max(6, currentZoom * 0.6);
    const hoverStroke = lineStroke * 1.5;

    allJoins.forEach(join => {
        const station1 = stationLookup[String(join.station_id1)];
        const station2 = stationLookup[String(join.station_id2)];
        if (station1 && station2) {
            const lineKey = String(join.line_id);
            const lineData = lineColors[lineKey];
            const strokeColor = lineData?.color || "#000000";

            const polyline = new google.maps.Polyline({
                path: [{ lat: station1.displayLat, lng: station1.displayLon }, { lat: station2.displayLat, lng: station2.displayLon }],
                geodesic: true,
                strokeColor: strokeColor,
                strokeOpacity: 1.0,
                strokeWeight: lineStroke,
                zIndex: 1,
                map: map
            });

            polyline.addListener('mouseover', () => polyline.setOptions({ strokeWeight: hoverStroke, zIndex: 10 }));
            polyline.addListener('mouseout', () => {
                const activeZoom = map.getZoom();
                polyline.setOptions({ strokeWeight: Math.max(6, activeZoom * 0.6), zIndex: 1 });
            });
            polyline.addListener('click', (e) => {
                showTooltip(e.latLng, {
                    stationName: lineData?.name_en || "Unknown Line", 
                    color: lineData?.color || "#000000",
                    count: `0/${lineData?.total_stations || 0}`, 
                    modelsSpotted: "0" 
                }, 'line');
            });
            
            if (!polylinesByLine[lineKey]) polylinesByLine[lineKey] = [];
            polylinesByLine[lineKey].push(polyline);
            polylines.push(polyline);
        }
    });
}