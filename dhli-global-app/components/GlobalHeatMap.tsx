'use client';
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Rectangle, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Compass, Calendar, MapPin } from 'lucide-react';

interface GlobalHeatMapProps {
  lat: number;
  lon: number;
  placeName: string;
  selectedYear: number;
  selectedMonth: number;
  selectedDay: number;
  selectedHour: number;
  indexVal: number;
  livestockMode: 'dairy' | 'beef';
  selectedCoords: { lat: number; lng: number } | null;
  onLocationChange: (lat: number, lon: number) => void;
}

function RecenterOnCoords({ lat, lon, hasCoords }: { lat: number; lon: number; hasCoords: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (hasCoords) {
      map.flyTo([lat, lon], 4, { duration: 1.2 });
    }
  }, [lat, lon, hasCoords, map]);
  return null;
}

export default function GlobalHeatMap({
  lat,
  lon,
  placeName,
  selectedYear,
  selectedMonth,
  selectedDay,
  selectedHour,
  indexVal,
  livestockMode,
  selectedCoords,
}: GlobalHeatMapProps) {
  const [mounted, setMounted] = useState(false);
  const [pinIcon, setPinIcon] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    const customIcon = L.divIcon({
      className: 'custom-radar-pin',
      html: `
        <div style="position: relative; width: 32px; height: 32px; display: flex; items-center; justify-content: center;">
          <div style="position: absolute; inset: 0; border-radius: 50%; background: ${livestockMode === 'dairy' ? 'rgba(37, 99, 235, 0.4)' : 'rgba(220, 38, 38, 0.4)'}; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 14px; height: 14px; top: 9px; left: 9px; border-radius: 50%; background: ${livestockMode === 'dairy' ? '#2563EB' : '#DC2626'}; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.5);"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    setPinIcon(customIcon);
  }, [livestockMode]);

  if (!mounted) {
    return (
      <div className="h-[420px] w-full bg-slate-900 rounded-3xl flex items-center justify-center text-slate-400 text-xs">
        Cargando cartografía científica global...
      </div>
    );
  }

  const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const solarDeclination = -23.44 * Math.cos(((selectedMonth + 0.5) / 12) * 2 * Math.PI);

  const thermalBands = [
    { bounds: [[60, -180], [85, 180]] as [[number, number], [number, number]], color: '#1E3A8A', opacity: 0.32 },
    { bounds: [[38, -180], [60, 180]] as [[number, number], [number, number]], color: solarDeclination > 5 ? '#FEF3C7' : '#3B82F6', opacity: 0.24 },
    { bounds: [[12, -180], [38, 180]] as [[number, number], [number, number]], color: solarDeclination > 0 ? '#B45309' : '#FDE68A', opacity: 0.28 },
    { bounds: [[-12, -180], [12, 180]] as [[number, number], [number, number]], color: '#7F1D1D', opacity: 0.36 },
    { bounds: [[-38, -180], [-12, 180]] as [[number, number], [number, number]], color: solarDeclination < 0 ? '#B45309' : '#93C5FD', opacity: 0.28 },
    { bounds: [[-60, -180], [-38, 180]] as [[number, number], [number, number]], color: solarDeclination < -5 ? '#FEF3C7' : '#3B82F6', opacity: 0.24 },
    { bounds: [[-85, -180], [-60, 180]] as [[number, number], [number, number]], color: '#1E3A8A', opacity: 0.32 },
  ];

  return (
    <div className="relative w-full h-[450px] rounded-3xl overflow-hidden shadow-sm border border-slate-200 bg-slate-950">
      
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={1.5}
        maxZoom={8}
        maxBounds={[[-85, -180], [85, 180]]}
        scrollWheelZoom={true}
        className="w-full h-full z-10"
      >
        {/* Capa libre de ArcGIS/Esri sin marcas de agua ni API Keys */}
        <TileLayer
          attribution='&copy; Esri &mdash; National Geographic, DeLorme, NAVTEQ'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        />

        {thermalBands.map((band, idx) => (
          <Rectangle
            key={idx}
            bounds={band.bounds}
            pathOptions={{
              fillColor: band.color,
              fillOpacity: band.opacity,
              stroke: false,
            }}
          />
        ))}

        {selectedCoords && pinIcon && (
          <>
            <Circle
              center={[lat, lon]}
              radius={80000}
              pathOptions={{
                color: livestockMode === 'dairy' ? '#2563EB' : '#DC2626',
                fillColor: livestockMode === 'dairy' ? '#2563EB' : '#DC2626',
                fillOpacity: 0.25,
                weight: 2,
              }}
            />
            <Marker position={[lat, lon]} icon={pinIcon}>
              <Popup>
                <div className="p-1 space-y-1 text-slate-800 text-xs">
                  <div className="font-bold flex items-center gap-1 text-slate-900">
                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                    {placeName}
                  </div>
                  <div>Lat: {lat.toFixed(3)} | Lon: {lon.toFixed(3)}</div>
                  <div className="font-semibold text-blue-600">
                    Índice {livestockMode === 'dairy' ? 'DHLI' : 'HLI'}: {indexVal}
                  </div>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        <RecenterOnCoords lat={lat} lon={lon} hasCoords={Boolean(selectedCoords)} />
      </MapContainer>

      {/* Etiquetas superiores */}
      <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold text-slate-700 flex items-center gap-2">
        <Compass className="w-4 h-4 text-slate-500" />
        <span>
          {selectedCoords 
            ? `${placeName} (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`
            : 'Exploración global (sin punto fijado)'}
        </span>
      </div>

      <div className="absolute top-3 right-3 z-[400] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold text-slate-700 flex items-center gap-2">
        <Calendar className="w-3.5 h-3.5 text-blue-600" />
        <span>{selectedDay} de {mesesNombres[selectedMonth]} {selectedYear} ({selectedHour}:00 UTC)</span>
      </div>

      {/* Escala de colores científica */}
      <div className="absolute bottom-3 left-3 right-3 z-[400] bg-white/95 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200 shadow-md space-y-1">
        <div className="flex justify-between items-center text-[10px] font-bold text-slate-700">
          <span>Escala de Estrés Térmico Global (THI / DHLI)</span>
          <span className="text-slate-400 font-normal">Sincronizado con el análisis multiescala</span>
        </div>
        <div
          className="h-2.5 w-full rounded-md shadow-inner"
          style={{
            background: 'linear-gradient(to right, #1E3A8A, #3B82F6, #93C5FD, #FEF3C7, #F59E0B, #DC2626, #7F1D1D)'
          }}
        />
        <div className="flex justify-between text-[9px] text-slate-600 font-mono">
          <span>-69.3 (Frío)</span>
          <span>-34.7</span>
          <span>0.0 (Confort)</span>
          <span>34.7</span>
          <span>52.0</span>
          <span className="font-bold text-red-600">69.3 (Estrés crítico)</span>
        </div>
      </div>

    </div>
  );
}