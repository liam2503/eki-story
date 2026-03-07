import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/layout/TopBar";
import BottomNav from "../components/layout/BottomNav";
import LineSearchBar from "../components/map/LineSearchBar";
import VisitModal from "../components/map/VisitModal";
import { useVisits } from "../hooks/useVisits";
import { useStations } from "../hooks/useStations";

export default function Home() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedLine, setSelectedLine] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const { visitedStationCodes, logVisit, removeVisit, getVisit } = useVisits();
  const { stations } = useStations(selectedLine?.line_cd ?? null);

  // Load Google Maps script once
  useEffect(() => {
    function initMap() {
      if (!mapRef.current || mapInstance.current) return;
      mapInstance.current = new google.maps.Map(mapRef.current, {
        zoom: 11,
        center: { lat: 35.6762, lng: 139.6503 },
        disableDefaultUI: true,
        styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
      });
      setMapReady(true);
    }

    if (window.google?.maps) {
      initMap();
    } else if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
      window.__initMap = initMap;
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&callback=__initMap`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    } else {
      window.__initMap = initMap;
    }
  }, []);

  // Plot markers when line is selected
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;

    // Clear old markers + polyline
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }

    if (!selectedLine || stations.length === 0) return;

    const lineColor = selectedLine.line_color_c ? `#${selectedLine.line_color_c}` : "#009B73";
    const bounds = new google.maps.LatLngBounds();

    // Draw polyline along the stations
    const path = stations.map((s) => ({ lat: s.lat, lng: s.lon }));
    polylineRef.current = new google.maps.Polyline({
      path,
      strokeColor: lineColor,
      strokeOpacity: 0.85,
      strokeWeight: 8,
      map: mapInstance.current,
    });

    // Draw markers
    stations.forEach((station) => {
      const visited = visitedStationCodes.has(station.station_cd);
      const pos = { lat: station.lat, lng: station.lon };
      bounds.extend(pos);

      const marker = new google.maps.Marker({
        position: pos,
        map: mapInstance.current,
        title: station.station_name_en || station.station_name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: visited ? 10 : 7,
          fillColor: visited ? "#FFD700" : "#FFFFFF",
          fillOpacity: 1,
          strokeWeight: 3,
          strokeColor: lineColor,
        },
      });
      marker.addListener("click", () => setSelectedStation(station));
      markersRef.current.push(marker);
    });

    // Fit map to the line
    mapInstance.current.fitBounds(bounds, 60);
  }, [mapReady, stations, visitedStationCodes, selectedLine]);

  function handleTabChange(tab) {
    if (tab === "feed") navigate("/feed");
    else if (tab === "lines") navigate("/lines");
    else if (tab === "profile") navigate("/profile");
  }

  return (
    <div className="relative w-full h-screen bg-gray-100 overflow-hidden">
      <div ref={mapRef} className="absolute inset-0 z-0" />
      <TopBar streak={0} alerts={0} />
      <LineSearchBar selectedLine={selectedLine} onSelect={setSelectedLine} />
      <BottomNav activeTab="map" onTabChange={handleTabChange} />
      {selectedStation && (
        <VisitModal
          station={selectedStation}
          existingVisit={getVisit(selectedStation.station_cd)}
          onClose={() => setSelectedStation(null)}
          onConfirm={async (note, stationName) => {
            await logVisit(selectedStation.station_cd, note, stationName, selectedStation.line_cd);
            setSelectedStation(null);
          }}
          onRemove={async () => {
            await removeVisit(selectedStation.station_cd);
            setSelectedStation(null);
          }}
        />
      )}
    </div>
  );
}
