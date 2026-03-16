import { lightenColor } from './map_utils.js';

export const markers = {};
export const decoMarkers = {};
export let userMarker = null;

export function renderVisibleMarkers(map, allStations, lineColors, activeLineFilter, showTooltip) {
    const bounds = map.getBounds();
    if (!bounds) return;
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const currentZoom = map.getZoom();
    const currentScale = Math.max(8, currentZoom - 4);
    const currentStroke = Math.max(5, currentZoom * 0.5);

    allStations.forEach(station => {
        const inView = station.displayLat >= sw.lat() && station.displayLat <= ne.lat() && station.displayLon >= sw.lng() && station.displayLon <= ne.lng();
        
        if (inView) {
            const lineKey = String(station.line_id); 
            const lineData = lineColors[lineKey];
            const markerColor = lineData?.color || "#000000";
            const visited = window.isVisited?.(station.id);

            if (!markers[station.id]) {
                const markerMap = activeLineFilter && String(station.line_id) !== activeLineFilter ? null : map;
                const marker = new google.maps.Marker({
                    position: { lat: station.displayLat, lng: station.displayLon },
                    map: markerMap,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: currentScale,
                        fillColor: visited ? lightenColor(markerColor, 40) : "#FFFFFF",
                        fillOpacity: 1,
                        strokeWeight: currentStroke,
                        strokeColor: markerColor,
                    },
                    zIndex: 2 
                });

                marker.addListener('click', () => {
                    const currentVisited = window.isVisited?.(station.id);
                    showTooltip(marker.getPosition(), {
                        stationId: station.id,
                        stationName: station.station_name_en || "Unknown Station",
                        lineName: lineData?.name_en || `Line ${lineKey}`,
                        color: lineData?.color || "#000000",
                        isVisited: currentVisited 
                    }, 'station');
                });

                markers[station.id] = marker;
            } else {
                markers[station.id].setOptions({
                    icon: {
                        ...markers[station.id].getIcon(),
                        fillColor: visited ? lightenColor(markerColor, 40) : "#FFFFFF"
                    }
                });

                if (markers[station.id].getMap() !== map) {
                    markers[station.id].setMap(map);
                }
            }
        } else if (markers[station.id] && markers[station.id].getMap() !== null) {
            markers[station.id].setMap(null);
        }
    });
}

export function updateUserMarker(map, pos) {
    if (!userMarker) {
        userMarker = new google.maps.Marker({
            position: pos,
            map: map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: "#4285F4",
                fillOpacity: 1,
                strokeWeight: 4,
                strokeColor: "#FFFFFF",
            },
            zIndex: 999
        });
    } else {
        userMarker.setPosition(pos);
    }
}