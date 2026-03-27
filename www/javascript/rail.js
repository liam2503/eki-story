import { syncStationData, syncLineData, syncJoinData } from './map_utils.js';
import { db } from './firebase.js';
import { doc, getDoc } from 'firebase/firestore';
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

window.filterToLine = function(lineId) {
    activeLineFilter = String(lineId);
    window.renderVisibleMarkers();
};

window.clearLineFilter = function() {
    activeLineFilter = null;
    window.renderVisibleMarkers();
};

window.initMap = async function() {
    const centerView = { lat: 35.6325, lng: 139.6525 };
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 14.8, 
        minZoom: 13,
        isFractionalZoomEnabled: true,
        center: centerView,
        disableDefaultUI: true,
        styles: window.getInitialMapStyles?.() || [
            { featureType: 'all', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            { featureType: 'landscape', stylers: [{ color: '#A5D6A7' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            { featureType: 'administrative', stylers: [{ visibility: 'off' }] },
        ]
    });

    window.map = map;

    const configSnap = await getDoc(doc(db, 'metadata', 'config'));
    const [stations, lines, joins] = await Promise.all([
        syncStationData(configSnap),
        syncLineData(configSnap),
        syncJoinData(configSnap)
    ]);

    const coordMap = {};
    stations.forEach(s => {
        const key = `${s.lat}_${s.lon}`;
        if (!coordMap[key]) coordMap[key] = [];
        coordMap[key].push(s);
    });

    allStations = stations;
    lineColors = lines;
    
    window.allStations = allStations;
    window.lineColors = lineColors;
    window.lineData = lineColors; 

    localStorage.setItem('stationData', JSON.stringify(stations));
    localStorage.setItem('lineData', JSON.stringify(lines));

    window.dispatchEvent(new CustomEvent('stationsLoaded'));
    window.dispatchEvent(new CustomEvent('lineDataLoaded'));

    allStations.forEach(s => {
        stationLookup[String(s.id)] = s;
    });

    Object.values(coordMap).forEach(group => {
        if (group.length === 1) {
            group[0].displayLat = Number(group[0].lat);
            group[0].displayLon = Number(group[0].lon);
        } else {
            group.sort((a, b) => String(a.line_id).localeCompare(String(b.line_id)));

            const radius = 0.00015;
            group.forEach((station, index) => {
                const angle = (index / group.length) * Math.PI * 2;
                station.displayLat = Number(station.lat) + (Math.cos(angle) * radius);
                const latRad = Number(station.lat) * (Math.PI / 180);
                station.displayLon = Number(station.lon) + ((Math.sin(angle) * radius) / Math.cos(latRad));
            });
        }
    });

    renderPolylines(map, joins, stationLookup, lineColors, showTooltip);
    initUserTracking();

    // Fade out and remove loading overlay once data is ready
    const overlay = document.getElementById('app-loading-overlay');
    if (overlay) {
        overlay.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => overlay.remove(), 500); 
    }

    map.addListener('idle', () => {
        renderVisibleMarkers(map, allStations, lineColors, activeLineFilter, showTooltip);
    });

    map.addListener('dragstart', () => {
        isFollowingUser = false;
        hideTooltip();
    });

    map.addListener('click', hideTooltip);

    document.getElementById('map-tooltip').addEventListener('click', async (e) => {
        const markBtn = e.target.closest('#mark-visited-btn');
        if (markBtn) {
            const id = markBtn.getAttribute('data-station-id');
            await toggleStation(id);
            hideTooltip();
        }

        const unmarkBtn = e.target.closest('#unmark-station-btn');
        if (unmarkBtn) {
            window.stationToUnmark = unmarkBtn.getAttribute('data-station-id');
            document.getElementById('unmark-confirm-modal').classList.remove('opacity-0', 'pointer-events-none');
            document.getElementById('unmark-confirm-box').classList.remove('scale-95');
            document.getElementById('unmark-confirm-box').classList.add('scale-100');
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
            (err) => console.warn(err),
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

window.renderVisibleMarkers = () => {
    renderVisibleMarkers(map, allStations, lineColors, activeLineFilter, showTooltip);
};

export function showTooltip(latLng, data, type) {
    const tooltip = document.getElementById('map-tooltip');
    const stationEl = document.getElementById('tooltip-station');
    const container = document.getElementById('tooltip-container');
    const arrow = document.getElementById('tooltip-arrow');
    const footer = document.getElementById('tooltip-footer');
    const fractionEl = document.getElementById('tooltip-line-fraction');
    const progressEl = document.getElementById('tooltip-line-progress');
    const linePill = document.getElementById('tooltip-line-pill');
    const lineText = document.getElementById('tooltip-line-text');
    const statusContainer = document.getElementById('tooltip-status-container');

    stationEl.innerText = data.stationName;

    if (type === 'station') {
        window.activeStationId = data.stationId;
        
        if (linePill) {
            linePill.classList.remove('hidden');
            linePill.style.backgroundColor = data.color;
        }
        if (lineText) {
            lineText.innerText = data.lineName;
        }

        const visited = window.isVisited?.(data.stationId);
        
        if (statusContainer) {
            if (visited) {
                statusContainer.innerHTML = `
                    <div class="flex items-center justify-center gap-2">
                        <span class="bg-[#B2FF59] border-[3px] border-black px-6 py-2 rounded-2xl text-xs font-black uppercase text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Visited</span>
                        <button id="unmark-station-btn" data-station-id="${data.stationId}" class="w-9 h-9 bg-[#FF5252] border-[3px] border-black rounded-full flex items-center justify-center text-white font-black hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="4"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                `;
            } else {
                statusContainer.innerHTML = `
                    <button id="mark-visited-btn" data-station-id="${data.stationId}" class="bg-[#40C4FF] border-[3px] border-black px-6 py-2 rounded-2xl text-xs font-black uppercase text-black hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all">
                        Mark as Visited?
                    </button>
                `;
            }
        }
        
        const dark = document.documentElement.classList.contains('dark');
        container.style.backgroundColor = dark ? '#1e293b' : 'white';
        container.style.borderColor = dark ? '#475569' : 'black';
        arrow.style.backgroundColor = dark ? '#1e293b' : 'white';
        arrow.style.borderRightColor = dark ? '#475569' : 'black';
        arrow.style.borderBottomColor = dark ? '#475569' : 'black';
        container.style.boxShadow = `10px 10px 0px 0px ${data.color}`;
        stationEl.style.color = dark ? '#f1f5f9' : 'black';

        if (fractionEl) fractionEl.classList.add('hidden');
        if (progressEl) progressEl.classList.add('hidden');
        if (footer) footer.classList.remove('hidden');
    } else {
        window.activeStationId = null;

        if (linePill) linePill.classList.add('hidden');

        container.style.backgroundColor = 'black';
        container.style.borderColor = data.color;
        arrow.style.backgroundColor = 'black';
        arrow.style.borderRightColor = data.color;
        arrow.style.borderBottomColor = data.color;
        container.style.boxShadow = `10px 10px 0px 0px ${data.color}`;
        stationEl.style.color = 'white';
        
        if (fractionEl) {
            fractionEl.classList.remove('hidden');
            fractionEl.innerHTML = `
                <div class="flex items-baseline mt-1">
                    <span class="text-3xl leading-none">${data.visitedCount}</span>
                    <span class="mx-0.5 opacity-40 text-xl leading-none">/</span>
                    <span class="text-sm opacity-60 leading-none">${data.totalCount}</span>
                </div>
            `;
        }

        if (progressEl) {
            progressEl.classList.remove('hidden');
            progressEl.innerHTML = '';
            for(let i = 0; i < data.totalCount; i++) {
                const segment = document.createElement('div');
                segment.className = `flex-1 h-full rounded-sm ${i < data.visitedCount ? 'bg-[#B2FF59]' : 'bg-gray-700'}`;
                progressEl.appendChild(segment);
            }
        }

        if (footer) footer.classList.add('hidden');
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

export function hideTooltip() {
    const tooltip = document.getElementById('map-tooltip');
    if (tooltip) {
        tooltip.style.opacity = '0';
        tooltip.classList.add('pointer-events-none');
        window.activeStationId = null;
    }
}
window.hideTooltip = hideTooltip;

document.addEventListener('DOMContentLoaded', () => {
    const cancelUnmarkBtn = document.getElementById('cancel-unmark-btn');
    const confirmUnmarkBtn = document.getElementById('confirm-unmark-btn');
    
    if (cancelUnmarkBtn && confirmUnmarkBtn) {
        cancelUnmarkBtn.addEventListener('click', () => {
            document.getElementById('unmark-confirm-modal').classList.add('opacity-0', 'pointer-events-none');
            document.getElementById('unmark-confirm-box').classList.add('scale-95');
            document.getElementById('unmark-confirm-box').classList.remove('scale-100');
        });
        
        confirmUnmarkBtn.addEventListener('click', async () => {
            if (window.stationToUnmark) {
                await toggleStation(window.stationToUnmark);
                window.stationToUnmark = null;
            }
            document.getElementById('unmark-confirm-modal').classList.add('opacity-0', 'pointer-events-none');
            document.getElementById('unmark-confirm-box').classList.add('scale-95');
            document.getElementById('unmark-confirm-box').classList.remove('scale-100');
            hideTooltip();
            window.renderVisibleMarkers();
        });
    }
});

const gScript = document.createElement('script');
gScript.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&callback=initMap&libraries=places&loading=async`;
gScript.async = true;
gScript.defer = true;
document.head.appendChild(gScript);