import { syncStationData, syncLineData, syncJoinData } from './map_utils.js';
import { renderPolylines, polylines } from './map_layers.js';
import { renderVisibleMarkers, updateUserMarker } from './map_markers.js';
import { toggleStation } from './user.js';

let map;
let allStations = [];
let lineColors = {};
let stationLookup = {};
let activeLineFilter = null;
let isFollowingUser = true;
let currentPosition = null;

// The main entry point called by Google Maps API
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
            { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
            { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
            { "featureType": "administrative", "stylers": [{ "visibility": "off" }] }
        ]
    });

    window.map = map;

    // Load Data from Firestore/Cache
    const [stations, lines, joins] = await Promise.all([
        syncStationData(),
        syncLineData(),
        syncJoinData()
    ]);

    // Handle overlapping stations (same Lat/Lon)
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
    window.allStations = allStations;

    allStations.forEach(s => {
        stationLookup[String(s.id)] = s;
    });

    // Initial Rendering
    renderPolylines(map, joins, stationLookup, lineColors, showTooltip);
    initUserTracking();

    // Map Event Listeners
    map.addListener('idle', () => {
        renderVisibleMarkers(map, allStations, lineColors, activeLineFilter, showTooltip);
    });

    map.addListener('dragstart', () => {
        isFollowingUser = false; // Unlock from user position when scrolling manually
        hideTooltip();
    });
    

    map.addListener('click', hideTooltip);

    document.getElementById('map-tooltip').addEventListener('click', async (e) => {
    const btn = e.target.closest('#unlock-button');
    if (btn) {
        const id = btn.getAttribute('data-station-id');
        await toggleStation(id); // Calls the toggle logic
    }
});
};

function initUserTracking() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                currentPosition = pos;
                updateUserMarker(map, pos);
                if (isFollowingUser) {
                    map.panTo(pos);
                }
            },
            (err) => console.warn("Geolocation error:", err),
            { enableHighAccuracy: true }
        );
    }
}

window.centerOnUser = function() {
    if (currentPosition) {
        isFollowingUser = true;
        map.panTo(currentPosition);
    }
};

// Global function to allow user.js to force a re-draw
window.renderVisibleMarkers = () => {
    renderVisibleMarkers(map, allStations, lineColors, activeLineFilter, showTooltip);
};

export function showTooltip(latLng, data, type) {
    const tooltip = document.getElementById('map-tooltip');
    const stationEl = document.getElementById('tooltip-station');
    const statusEl = document.getElementById('tooltip-status');
    const container = document.getElementById('tooltip-container');
    const arrow = document.getElementById('tooltip-arrow');

    stationEl.innerText = data.stationName;

    if (type === 'station') {
        window.activeStationId = data.stationId;

        const visited = window.isVisited?.(data.stationId);
        statusEl.innerText = visited ? "VISITED" : "LOCKED";
        statusEl.style.backgroundColor = visited ? "#B2FF59" : "#ECEFF1";
        statusEl.style.color = visited ? "black" : "#9E9E9E";
        
        // --- ADD THIS BUTTON LOGIC ---
        const buttonText = visited ? 'Relock Station' : 'Unlock Station';
        const buttonColor = visited ? 'bg-red-500' : 'bg-green-500';
        
        // Assuming you have a div with id="tooltip-button-container" in your HTML
        const btnContainer = document.getElementById('tooltip-button-container');
        if (btnContainer) {
            btnContainer.innerHTML = `
                <button id="unlock-button" 
                        data-station-id="${data.stationId}" 
                        class="${buttonColor} text-white font-black px-4 py-2 mt-2 rounded-full uppercase text-[10px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all w-full">
                    ${buttonText}
                </button>
            `;
        }
        
        container.style.backgroundColor = 'white';
        arrow.style.backgroundColor = 'white';
        container.style.boxShadow = `10px 10px 0px 0px ${data.color}`;
    } else {
        window.activeStationId = null;
    }

    // Positioning Logic
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

export function hideTooltip() {
    const tooltip = document.getElementById('map-tooltip');
    if (tooltip) {
        tooltip.style.opacity = '0';
        tooltip.classList.add('pointer-events-none');
        window.activeStationId = null;
    }
}

// The script loader that starts the whole map process
const gScript = document.createElement('script');
gScript.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&callback=initMap&libraries=places&loading=async`;
gScript.async = true;
gScript.defer = true;
document.head.appendChild(gScript);