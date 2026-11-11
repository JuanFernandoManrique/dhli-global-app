'use client';
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, LayersControl, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

interface FarmMapProps {
  lat: number;
  lon: number;
  onLocationChange: (lat: number, lon: number) => void;
  heatLevel?: number;
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 16, { duration: 1.5 });
  }, [center, map]);
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
    <div className="relative w-full h-[480px] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950 z-10">
      <MapContainer
        center={[lat, lon]}
        zoom={16}
        maxZoom={22}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Google satélite (Híbrido HD)">
            <TileLayer
              attribution="&copy; Google Maps Satelital"
              url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
              maxNativeZoom={20}
              maxZoom={22}
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="Google satélite (Puro)">
            <TileLayer
              attribution="&copy; Google Maps Satelital"
              url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
              maxNativeZoom={20}
              maxZoom={22}
            />
          </LayersControl.BaseLayer>

          {/* DESMARCADO POR DEFECTO: El usuario decide cuándo encender la capa de calor */}
          <LayersControl.Overlay name="Capa térmica de estrés">
            <>
              <Circle
                center={[lat, lon]}
                radius={900}
                pathOptions={{ color: heatColor, fillColor: heatColor, fillOpacity: 0.16, weight: 1.5, dashArray: '4, 8' }}
              />
              <Circle
                center={[lat, lon]}
                radius={450}
                pathOptions={{ color: heatColor, fillColor: heatColor, fillOpacity: 0.25, weight: 2 }}
              />
              <Circle
                center={[lat, lon]}
                radius={180}
                pathOptions={{ color: heatColor, fillColor: heatColor, fillOpacity: 0.38, weight: 3 }}
              />
            </>
          </LayersControl.Overlay>
        </LayersControl>

        <ChangeView center={[lat, lon]} />
        <MapClickHandler onLocationChange={onLocationChange} />
        {icon && <Marker position={[lat, lon]} icon={icon} />}
      </MapContainer>

      <div className="absolute top-4 left-4 z-[400] bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl text-white text-xs border border-white/10 pointer-events-none flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        Satélite de alta resolución: haz clic en cualquier potrero para reubicar el pin
      </div>
    </div>
  );
}