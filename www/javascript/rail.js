import { db } from './firebase.js';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

let map;
const markers = {};
let allStations = [];
let allJoins = [];
let lineColors = {};
let polylines = [];
const polylinesByLine = {};
let stationLookup = {};
let placesService;
const decoMarkers = {};
let activeLineFilter = null;

window.initMap = async function() {
    const centerView = { lat: 35.6325, lng: 139.6525 };
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 14.8, 
        minZoom: 13,
        isFractionalZoomEnabled: true,
        center: centerView,
        disableDefaultUI: true,
        styles: [
            { "featureType": "all", "elementType": "labels", "stylers": [{ "visibility": "off" }] },
            { "featureType": "landscape", "stylers": [{ "color": "#A5D6A7" }] },
            { "featureType": "landscape.man_made", "stylers": [{ "color": "#CFD8DC" }] },
            { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ECEFF1" }] },
            { "featureType": "water", "stylers": [{ "color": "#80D8FF" }] },
            { "featureType": "poi.park", "stylers": [{ "color": "#81C784" }] },
            { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
            { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
            { "featureType": "administrative", "stylers": [{ "visibility": "off" }] }
        ]
    });
    placesService = new google.maps.places.PlacesService(map);
    window.map = map;

    const [stations, lines, joins] = await Promise.all([
        syncStationData(),
        syncLineData(),
        syncJoinData()
    ]);

    const coordMap = {};
    stations.forEach(s => {
        const key = `${s.lat}_${s.lon}`;
        if (!coordMap[key]) coordMap[key] = [];
        coordMap[key].push(s);
    });

    Object.values(coordMap).forEach(group => {
        if (group.length === 1) {
            group[0].displayLat = Number(group[0].lat);
            group[0].displayLon = Number(group[0].lon);
        } else {
            const radius = 0.00015;
            group.forEach((station, index) => {
                const angle = (index / group.length) * Math.PI * 2;
                station.displayLat = Number(station.lat) + (Math.cos(angle) * radius);
                const latRad = Number(station.lat) * (Math.PI / 180);
                station.displayLon = Number(station.lon) + ((Math.sin(angle) * radius) / Math.cos(latRad));
            });
        }
    });

    allStations = stations;
    lineColors = lines;
    allJoins = joins;
    window.allStations = allStations;
    window.lineColors = lineColors;

    allStations.forEach(s => {
        stationLookup[String(s.station_id || s.id)] = s;
        stationLookup[String(s.id)] = s;
    });

    renderPolylines();
    renderVisibleMarkers();
    fetchDecorations();

    map.addListener('idle', () => {
        renderVisibleMarkers();
        fetchDecorations();
    });

    map.addListener('zoom_changed', () => {
        updateAllScales();
        hideTooltip();
    });

    map.addListener('click', hideTooltip);
    map.addListener('dragstart', hideTooltip);
};

async function syncStationData() {
    const configRef = doc(db, 'metadata', 'config');
    const configSnap = await getDoc(configRef);
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

async function syncLineData() {
    const configRef = doc(db, 'metadata', 'config');
    const configSnap = await getDoc(configRef);
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
                    // This pulls the station_count saved by your stacount.js script
                    total_stations: data.station_count || 0 
                };
            }
        });
        localStorage.setItem('lineData', JSON.stringify(lines));
        localStorage.setItem('lineVersion', remoteVersion.toString());
        return lines;
    }
    return JSON.parse(localData);
}

async function syncJoinData() {
    const configRef = doc(db, 'metadata', 'config');
    const configSnap = await getDoc(configRef);
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

function fetchDecorations() {
    const bounds = map.getBounds();
    if (!bounds || !placesService) return;
    const request = { bounds: bounds, type: ['park', 'natural_feature', 'stadium'] };
    placesService.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            results.forEach(place => {
                if (!decoMarkers[place.place_id]) renderDecoIcon(place);
            });
        }
    });
}

function renderDecoIcon(place) {
    const types = place.types;
    let color = "#CFD8DC";
    if (types.includes('park') || types.includes('zoo')) color = "#66BB6A";
    else if (types.includes('natural_feature')) color = "#90A4AE";
    else color = "#ECEFF1";

    const currentZoom = map.getZoom();
    const decoScale = Math.max(5, currentZoom - 4);
    const marker = new google.maps.Marker({
        position: place.geometry.location,
        map: map,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: decoScale,
            fillColor: color,
            fillOpacity: 1,
            strokeWeight: 3,
            strokeColor: "#000000",
        },
        zIndex: 0 
    });
    decoMarkers[place.place_id] = marker;
}

function renderPolylines() {
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
    const lineKey = String(join.line_id);
    const lineData = lineColors[lineKey];
    
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

    window.filterToLine = function(lineId) {
        activeLineFilter = String(lineId);
        polylines.forEach(poly => poly.setMap(null));
        (polylinesByLine[activeLineFilter] || []).forEach(poly => poly.setMap(map));
        Object.entries(markers).forEach(([stationId, marker]) => {
            const station = stationLookup[stationId];
            marker.setMap(station && String(station.line_id) === activeLineFilter ? map : null);
        });
    };

    window.clearLineFilter = function() {
        activeLineFilter = null;
        polylines.forEach(poly => poly.setMap(map));
        Object.values(markers).forEach(marker => marker.setMap(map));
    };
}

function renderVisibleMarkers() {
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
            if (!markers[station.id]) {
                const lineKey = String(station.line_id); 
                const lineData = lineColors[lineKey];
                const markerColor = lineData?.color || "#000000";

                const markerMap = activeLineFilter && String(station.line_id) !== activeLineFilter ? null : map;
                const marker = new google.maps.Marker({
                    position: { lat: station.displayLat, lng: station.displayLon },
                    map: markerMap,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: currentScale,
                        fillColor: "#FFFFFF",
                        fillOpacity: 1,
                        strokeWeight: currentStroke,
                        strokeColor: markerColor,
                    },
                    zIndex: 2 
                });

                marker.addListener('mouseover', () => {
                    const icon = marker.getIcon();
                    marker.setIcon({ ...icon, scale: icon.scale * 1.3, strokeWeight: icon.strokeWeight * 1.3 });
                    marker.setZIndex(20);
                });

                marker.addListener('mouseout', () => {
                    const activeZoom = map.getZoom();
                    marker.setIcon({
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: Math.max(8, activeZoom - 4),
                        fillColor: "#FFFFFF",
                        fillOpacity: 1,
                        strokeWeight: Math.max(5, activeZoom * 0.5),
                        strokeColor: markerColor
                    });
                    marker.setZIndex(2);
                });

                marker.addListener('click', () => {
    const lineKey = String(station.line_id);
    const lineData = lineColors[lineKey];
    
    showTooltip(marker.getPosition(), {
        // Updated to use station_name_en as requested
        stationName: station.station_name_en || "Unknown Station",
        lineName: lineData?.name_en || `Line ${lineKey}`,
        color: lineData?.color || "#000000"
    }, 'station');
});
                markers[station.id] = marker;
            } else if (markers[station.id].getMap() !== map) {
                markers[station.id].setMap(map);
            }
        } else if (markers[station.id] && markers[station.id].getMap() !== null) {
            markers[station.id].setMap(null);
        }
        // Re-apply filter for existing markers coming back into view
        if (inView && markers[station.id] && activeLineFilter) {
            const show = String(station.line_id) === activeLineFilter;
            markers[station.id].setMap(show ? map : null);
        }
    });
}

function showTooltip(latLng, data, type) {
    const tooltip = document.getElementById('map-tooltip');
    const container = document.getElementById('tooltip-container');
    const arrow = document.getElementById('tooltip-arrow');
    const stationEl = document.getElementById('tooltip-station');
    const statusEl = document.getElementById('tooltip-status');
    const countWrapper = document.getElementById('tooltip-count-wrapper');
    const linePill = document.getElementById('tooltip-line-pill');
    const lineText = document.getElementById('tooltip-line-text');
    const countNowEl = document.getElementById('tooltip-count-now');
    const countTotalEl = document.getElementById('tooltip-count-total');
    const modelsNumEl = document.getElementById('tooltip-models-num');

    stationEl.innerText = data.stationName;

    if (type === 'line') {
        if (linePill) linePill.classList.add('hidden');
        
        container.style.backgroundColor = data.color;
        arrow.style.backgroundColor = data.color;
        container.style.boxShadow = '10px 10px 0px 0px rgba(0,0,0,1)';
        
        stationEl.style.color = 'white';
        stationEl.style.textShadow = '3px 3px 0px #000';

        statusEl.classList.add('hidden');
        countWrapper.classList.remove('hidden');
        countWrapper.classList.add('flex');

        const [now, total] = (data.count || "0/0").split('/');
        if (countNowEl) countNowEl.innerText = now;
        if (countTotalEl) countTotalEl.innerText = total;
        if (modelsNumEl) modelsNumEl.innerText = data.modelsSpotted || "5";

    } else {
        if (linePill) {
            linePill.classList.remove('hidden');
            linePill.style.backgroundColor = data.color;
            lineText.innerText = data.lineName;
        }

        container.style.backgroundColor = 'white';
        arrow.style.backgroundColor = 'white';
        container.style.boxShadow = `10px 10px 0px 0px ${data.color}`;
        
        stationEl.style.color = 'black';
        stationEl.style.textShadow = 'none';

        statusEl.classList.remove('hidden');
        countWrapper.classList.add('hidden');
        countWrapper.classList.remove('flex');
    }

    const projection = map.getProjection();
    const bounds = map.getBounds();
    const scale = Math.pow(2, map.getZoom());
    
    const topRight = projection.fromLatLngToPoint(bounds.getNorthEast());
    const bottomLeft = projection.fromLatLngToPoint(bounds.getSouthWest());
    const worldPoint = projection.fromLatLngToPoint(latLng);

    const x = (worldPoint.x - bottomLeft.x) * scale;
    const y = (worldPoint.y - topRight.y) * scale;

    const mapDiv = document.getElementById('map');
    const rect = mapDiv.getBoundingClientRect();
    
    tooltip.style.opacity = '1';
    tooltip.classList.remove('pointer-events-none');

    const tooltipRect = tooltip.getBoundingClientRect();
    tooltip.style.left = `${x + rect.left - (tooltipRect.width / 2)}px`;
    tooltip.style.top = `${y + rect.top - tooltipRect.height - 14}px`;
}

function hideTooltip() {
    const tooltip = document.getElementById('map-tooltip');
    if (tooltip) {
        tooltip.style.opacity = '0';
        tooltip.classList.add('pointer-events-none');
    }
}

function updateAllScales() {
    const currentZoom = map.getZoom();
    const newScale = Math.max(8, currentZoom - 4);
    const newStroke = Math.max(5, currentZoom * 0.5);
    const lineStroke = Math.max(6, currentZoom * 0.6);
    const decoScale = Math.max(5, currentZoom - 4);

    Object.values(markers).forEach(marker => {
        const icon = marker.getIcon();
        if (icon) {
            icon.scale = newScale;
            icon.strokeWeight = newStroke;
            marker.setIcon(icon);
        }
    });

    Object.values(decoMarkers).forEach(marker => {
        const icon = marker.getIcon();
        if (icon) {
            icon.scale = decoScale;
            marker.setIcon(icon);
        }
    });

    polylines.forEach(poly => poly.setOptions({ strokeWeight: lineStroke }));
}

const gScript = document.createElement('script');
gScript.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&callback=initMap&libraries=places&loading=async`;
gScript.async = true;
gScript.defer = true;
document.head.appendChild(gScript);