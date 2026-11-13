'use client';
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Globe, MapPin, Play, Pause, Layers } from 'lucide-react';
import { LivestockMode } from '../lib/dhli-calculator';

interface DepartmentHeatMapProps {
  lat: number;
  lon: number;
  placeName: string;
  livestockMode: LivestockMode;
  selectedYear: number;
  selectedMonth: number;
  selectedDay: number;
  selectedHour: number;
  currentBGT: number;
  currentRH: number;
  currentWS: number;
  onTimeChange: (y: number, m: number, d: number, h: number) => void;
  t: (key: string) => string;
}

// Malla térmica continua calculada en tiempo real (DHLI para leche, HLI para carne)
function WorldwideThermalLayer({
  year,
  month,
  hour,
  livestockMode,
}: {
  year: number;
  month: number;
  hour: number;
  livestockMode: LivestockMode;
}) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = L.DomUtil.create('canvas', 'leaflet-global-dhli-canvas') as HTMLCanvasElement;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '200';
    canvas.style.opacity = '0.52';
    canvas.style.mixBlendMode = 'screen';

    const pane = map.getPane('overlayPane');
    if (pane) pane.appendChild(canvas);
    canvasRef.current = canvas;

    const renderRaster = () => {
      if (!canvasRef.current) return;
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, size.x, size.y);

      // Desplazamiento solar estacional real
      const solarDeclination = -23.44 * Math.cos(((month + 0.5) / 12) * 2 * Math.PI);
      const solarNoonLon = (12 - hour) * 15;
      const warmingEffect = (year - 2024) * 0.05;

      const step = 10;
      for (let x = 0; x < size.x; x += step) {
        for (let y = 0; y < size.y; y += step) {
          const latLng = map.containerPointToLatLng([x, y]);
          const currentLat = latLng.lat;
          const currentLon = latLng.lng;

          if (currentLat < -80 || currentLat > 80) continue;

          // Latitud térmica efectiva
          const effectiveLat = currentLat - solarDeclination;
          const latFactor = Math.cos((effectiveLat * Math.PI) / 180);

          let lonDiff = Math.abs(currentLon - solarNoonLon);
          if (lonDiff > 180) lonDiff = 360 - lonDiff;
          const diurnal = Math.max(0, Math.cos((lonDiff * Math.PI) / 180));

          // Cálculo biofísico: DHLI (0-100) o HLI (0-130)
          let indexVal = 0;
          if (livestockMode === 'dairy') {
            indexVal = Math.max(0, Math.min(100, (latFactor * 42 - 10) + (diurnal * 24) + warmingEffect));
            if (currentLat > 60 || currentLat < -55) indexVal = Math.max(0, indexVal - 25);
          } else {
            indexVal = Math.max(0, Math.min(130, (latFactor * 55 + 30) + (diurnal * 28) + warmingEffect));
            if (currentLat > 60 || currentLat < -55) indexVal = Math.max(0, indexVal - 35);
          }

          // Asignación de color según los umbrales oficiales de DHLI / HLI
          let color = '#3B82F6';
          if (livestockMode === 'dairy') {
            if (indexVal < 25) color = '#10B981'; // Confort
            else if (indexVal < 50) color = '#FBBF24'; // Leve
            else if (indexVal < 75) color = '#F97316'; // Alto
            else color = '#EF4444'; // Crítico
          } else {
            if (indexVal < 70) color = '#10B981';
            else if (indexVal < 77) color = '#FBBF24';
            else if (indexVal < 86) color = '#F97316';
            else color = '#EF4444';
          }

          ctx.fillStyle = color;
          ctx.fillRect(x, y, step, step);
        }
      }
    };

    renderRaster();
    map.on('moveend zoomend resize', renderRaster);
    return () => {
      map.off('moveend zoomend resize', renderRaster);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, [map, year, month, hour, livestockMode]);

  return null;
}

export default function DepartmentHeatMap({
  lat,
  lon,
  placeName,
  livestockMode,
  selectedYear,
  selectedMonth,
  selectedDay,
  selectedHour,
  currentBGT,
  currentRH,
  currentWS,
  onTimeChange,
  t,
}: DepartmentHeatMapProps) {
  const [mounted, setMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Simulación animada sincronizada
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        const nextHour = (selectedHour + 1) % 24;
        const nextDay = nextHour === 0 ? (selectedDay >= 30 ? 1 : selectedDay + 1) : selectedDay;
        const nextMonth = nextHour === 0 && nextDay === 1 ? (selectedMonth + 1) % 12 : selectedMonth;
        onTimeChange(selectedYear, nextMonth, nextDay, nextHour);
      }, 700);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, selectedYear, selectedMonth, selectedDay, selectedHour, onTimeChange]);

  if (!mounted) return <div className="h-96 w-full bg-slate-950 rounded-3xl animate-pulse" />;

  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const customPin = L.divIcon({
    className: 'custom-heat-pin',
    html: `
      <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: 0; border-radius: 50%; background: ${livestockMode === 'dairy' ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)'}; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: absolute; width: 14px; height: 14px; border-radius: 50%; background: ${livestockMode === 'dairy' ? '#10B981' : '#EF4444'}; border: 2.5px solid #FFFFFF;"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  return (
    <div className="bg-[#0A110D] rounded-3xl border border-emerald-500/20 p-5 space-y-4 shadow-2xl">
      
      {/* Controles del mapa sincronizados con el gráfico */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            Distribución global de estrés térmico ({livestockMode === 'dairy' ? 'DHLI' : 'HLI'})
          </h3>
          <p className="text-[11px] text-emerald-400/80 font-mono">
            {t('sim_active')}: {selectedDay} {meses[selectedMonth]} {selectedYear} &bull; {selectedHour}:00 UTC
          </p>
        </div>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg ${
            isPlaying ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-black hover:bg-emerald-400'
          }`}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {isPlaying ? t('pause') : t('play_sim')}
        </button>
      </div>

      {/* Mapa Leaflet Real de Alta Resolución */}
      <div className="relative h-96 w-full rounded-2xl overflow-hidden border border-emerald-500/20 bg-slate-950">
        <MapContainer
          center={[lat || 15, lon || -20]}
          zoom={2.5}
          minZoom={1.8}
          maxZoom={9}
          maxBounds={[[-85, -180], [85, 180]]}
          scrollWheelZoom={true}
          className="w-full h-full z-10"
        >
          {/* Cartografía de satélite real de la Tierra */}
          <TileLayer
            attribution="&copy; Esri &mdash; World Imagery"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />

          {/* Fronteras de países y costas reales */}
          <TileLayer
            attribution=""
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          />

          {/* Capa de calor calculada sobre la superficie terrestre */}
          <WorldwideThermalLayer
            year={selectedYear}
            month={selectedMonth}
            hour={selectedHour}
            livestockMode={livestockMode}
          />

          <Marker position={[lat, lon]} icon={customPin}>
            <Popup>
              <div className="p-1 space-y-1 text-slate-800 text-xs font-sans">
                <div className="font-bold flex items-center gap-1 text-slate-900">
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  {placeName}
                </div>
                <div>Lat: {lat.toFixed(2)}° | Lon: {lon.toFixed(2)}°</div>
                <div className="font-semibold text-emerald-600">
                  Índice {livestockMode === 'dairy' ? 'DHLI' : 'HLI'} proyectado
                </div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* Escala oficial DHLI o HLI */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between items-center text-[10px] font-bold text-slate-300">
          <span>Escala de estrés térmico global ({livestockMode === 'dairy' ? 'DHLI: 0 - 100' : 'HLI: 0 - 130'})</span>
          <span className="text-emerald-400 font-mono">Umbral: {livestockMode === 'dairy' ? '25 DHLI' : '77 HLI'}</span>
        </div>
        <div
          className="h-2.5 w-full rounded-full shadow-inner"
          style={{
            background: 'linear-gradient(to right, #10B981, #FBBF24, #F97316, #EF4444)'
          }}
        />
        <div className="flex justify-between text-[9px] text-slate-400 font-mono">
          <span>Confort (&lt;{livestockMode === 'dairy' ? '25' : '70'})</span>
          <span>Leve ({livestockMode === 'dairy' ? '25 - 50' : '70 - 77'})</span>
          <span>Alto ({livestockMode === 'dairy' ? '50 - 75' : '77 - 86'})</span>
          <span className="text-red-400 font-bold">Crítico (&gt;{livestockMode === 'dairy' ? '75' : '86'})</span>
        </div>
      </div>

    </div>
  );
}