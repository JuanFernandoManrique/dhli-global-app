'use client';
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Rectangle, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Layers, Calendar, Clock, MapPin, Eye, Compass } from 'lucide-react';

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
  onLocationChange: (lat: number, lon: number) => void;
}

// Controlador para centrar suavemente cuando el usuario busca un lugar
function RecenterOnCoords({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lon], 4, { duration: 1.2 });
  }, [lat, lon, map]);
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
  onLocationChange,
}: GlobalHeatMapProps) {
  const [mounted, setMounted] = useState(false);
  const [pinIcon, setPinIcon] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    const customIcon = L.divIcon({
      className: 'custom-radar-pin',
      html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; items-center; justify-content: center;">
          <div style="position: absolute; inset: 0; border-radius: 50%; background: ${livestockMode === 'dairy' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 16px; height: 16px; top: 10px; left: 10px; border-radius: 50%; background: ${livestockMode === 'dairy' ? '#10B981' : '#F59E0B'}; border: 3px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.5);"></div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
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

  // Cálculo de la declinación solar estacional para mover la franja térmica (como en el artículo)
  const solarDeclination = -23.44 * Math.cos(((selectedMonth + 0.5) / 12) * 2 * Math.PI);

  // Bandas térmicas por latitud interpoladas con la estación del año
  const thermalBands = [
    { bounds: [[60, -180], [85, 180]] as [[number, number], [number, number]], color: '#1E3A8A', opacity: 0.35, label: 'Polar Norte (-69.3)' },
    { bounds: [[40, -180], [60, 180]] as [[number, number], [number, number]], color: solarDeclination > 5 ? '#FEF3C7' : '#3B82F6', opacity: 0.28, label: 'Templada Norte' },
    { bounds: [[15, -180], [40, 180]] as [[number, number], [number, number]], color: solarDeclination > 0 ? '#B45309' : '#FDE68A', opacity: 0.32, label: 'Subtropical Norte' },
    { bounds: [[-15, -180], [15, 180]] as [[number, number], [number, number]], color: '#7F1D1D', opacity: 0.40, label: 'Ecuatorial Crítica (69.3)' },
    { bounds: [[-40, -180], [-15, 180]] as [[number, number], [number, number]], color: solarDeclination < 0 ? '#B45309' : '#93C5FD', opacity: 0.32, label: 'Subtropical Sur' },
    { bounds: [[-60, -180], [-40, 180]] as [[number, number], [number, number]], color: solarDeclination < -5 ? '#FEF3C7' : '#3B82F6', opacity: 0.28, label: 'Templada Sur' },
    { bounds: [[-85, -180], [-60, 180]] as [[number, number], [number, number]], color: '#1E3A8A', opacity: 0.35, label: 'Polar Sur (-69.3)' },
  ];

  return (
    <div className="relative w-full h-[460px] rounded-3xl overflow-hidden shadow-lg border border-slate-200 bg-slate-950">
      
      {/* Contenedor Leaflet Real con límites mundiales */}
      <MapContainer
        center={[lat, lon]}
        zoom={3}
        minZoom={1.8}
        maxZoom={10}
        maxBounds={[[-85, -180], [85, 180]]}
        scrollWheelZoom={true}
        className="w-full h-full z-10"
      >
        {/* Capa de Cartografía Científica Clara de Alta Resolución (CartoDB Positron) */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> | Natural Earth'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Capas térmicas translúcidas que reaccionan a la estación y año */}
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

        {/* Círculo térmico de alta precisión sobre el predio */}
        <Circle
          center={[lat, lon]}
          radius={70000}
          pathOptions={{
            color: livestockMode === 'dairy' ? '#10B981' : '#F59E0B',
            fillColor: livestockMode === 'dairy' ? '#10B981' : '#F59E0B',
            fillOpacity: 0.3,
            weight: 2,
          }}
        />

        {/* Pin georreferenciado exacto con Popup informativo */}
        {pinIcon && (
          <Marker position={[lat, lon]} icon={pinIcon}>
            <Popup className="custom-popup">
              <div className="p-1 space-y-1 text-slate-800 text-xs">
                <div className="font-bold flex items-center gap-1 text-slate-900">
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  {placeName}
                </div>
                <div>Lat: {lat.toFixed(3)} | Lon: {lon.toFixed(3)}</div>
                <div className="font-semibold text-emerald-600">
                  Índice {livestockMode === 'dairy' ? 'DHLI' : 'HLI'}: {indexVal}
                </div>
                <div className="text-[10px] text-slate-500">
                  {selectedDay} {mesesNombres[selectedMonth]} {selectedYear} ({selectedHour}:00 UTC)
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        <RecenterOnCoords lat={lat} lon={lon} />
      </MapContainer>

      {/* Cuadrícula de coordenadas en las esquinas */}
      <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-md text-xs font-semibold text-slate-700 flex items-center gap-2">
        <Compass className="w-4 h-4 text-slate-500" />
        <span>Predio: <strong className="text-slate-900 font-bold">{placeName}</strong> ({lat.toFixed(2)}°, {lon.toFixed(2)}°)</span>
      </div>

      <div className="absolute top-3 right-3 z-[400] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-md text-xs font-semibold text-slate-700 flex items-center gap-2">
        <Calendar className="w-3.5 h-3.5 text-blue-600" />
        <span>{selectedDay} de {mesesNombres[selectedMonth]} {selectedYear} - {selectedHour}:00 UTC</span>
      </div>

      {/* Barra de escala científica idéntica al estudio del artículo */}
      <div className="absolute bottom-3 left-3 right-3 z-[400] bg-white/95 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200 shadow-lg space-y-1">
        <div className="flex justify-between items-center text-[11px] font-bold text-slate-700">
          <span>Escala de Estrés Térmico Global (THI / DHLI)</span>
          <span className="text-slate-500 font-normal">Sincronizado con el horizonte multiescala</span>
        </div>
        <div
          className="h-3 w-full rounded-md shadow-inner"
          style={{
            background: 'linear-gradient(to right, #1E3A8A, #3B82F6, #93C5FD, #FEF3C7, #F59E0B, #DC2626, #7F1D1D)'
          }}
        />
        <div className="flex justify-between text-[10px] text-slate-600 font-mono">
          <span>-69.3 (Frío extremo)</span>
          <span>-34.7</span>
          <span>0.0 (Confort térmico)</span>
          <span>34.7</span>
          <span>52.0</span>
          <span className="font-bold text-red-600">69.3 (Estrés crítico)</span>
        </div>
      </div>

    </div>
  );
}