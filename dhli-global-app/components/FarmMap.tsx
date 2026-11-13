'use client';
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, LayersControl, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

interface FarmMapProps {
  lat: number;
  lon: number;
  onLocationChange: (lat: number, lon: number) => void;
  heatLevel?: number;
}

// Controlador inteligente que solo centra la cámara cuando las coordenadas realmente cambian
function SmartCenterView({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  const lastCoordsRef = useRef<[number, number]>([lat, lon]);

  useEffect(() => {
    const [prevLat, prevLon] = lastCoordsRef.current;
    const distance = Math.hypot(prevLat - lat, prevLon - lon);
    // Solo vuela al punto si cambió significativamente (nueva búsqueda o clic)
    if (distance > 0.0001) {
      map.flyTo([lat, lon], map.getZoom(), { duration: 1.2 });
      lastCoordsRef.current = [lat, lon];
    }
  }, [lat, lon, map]);

  return null;
}

function MapClickHandler({ onLocationChange }: { onLocationChange: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function FarmMap({ lat, lon, onLocationChange, heatLevel = 45 }: FarmMapProps) {
  const [icon, setIcon] = useState<any>(null);

  useEffect(() => {
    const customIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
    setIcon(customIcon);
  }, []);

  const heatColor = heatLevel < 25 ? '#10B981' : heatLevel < 50 ? '#FBBF24' : heatLevel < 75 ? '#F97316' : '#EF4444';

  return (
    <div className="relative w-full h-full min-h-[520px] rounded-3xl overflow-hidden shadow-2xl border border-emerald-500/20 bg-slate-950">
      <MapContainer
        center={[lat, lon]}
        zoom={16}
        maxZoom={21}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Satélite híbrido HD">
            <TileLayer
              attribution="&copy; Google Maps Satelital"
              url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
              maxNativeZoom={20}
              maxZoom={21}
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="Satélite puro">
            <TileLayer
              attribution="&copy; Google Maps Satelital"
              url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
              maxNativeZoom={20}
              maxZoom={21}
            />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay checked name="Círculo térmico de predio">
            <Circle
              center={[lat, lon]}
              radius={350}
              pathOptions={{ color: heatColor, fillColor: heatColor, fillOpacity: 0.28, weight: 2 }}
            />
          </LayersControl.Overlay>
        </LayersControl>

        <SmartCenterView lat={lat} lon={lon} />
        <MapClickHandler onLocationChange={onLocationChange} />
        {icon && <Marker position={[lat, lon]} icon={icon} />}
      </MapContainer>

      <div className="absolute top-4 left-4 z-[400] bg-black/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-white text-xs border border-white/10 pointer-events-none flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        Haz clic en cualquier potrero cercano para mover el pin o arrastra para explorar
      </div>
    </div>
  );
}