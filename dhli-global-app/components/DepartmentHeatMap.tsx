'use client';
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Play, Pause, Calendar, Clock, MapPin, Globe } from 'lucide-react';

interface DepartmentHeatMapProps {
  lat: number;
  lon: number;
  placeName: string;
  livestockMode: 'dairy' | 'beef';
  t: (key: string) => string;
}

// Capa de Calor Continua y Suave (Sin pixelado tosco, idéntica a modelos meteorológicos)
function GlobalThermalSmoothLayer({
  year,
  month,
  hour,
  livestockMode,
}: {
  year: number;
  month: number;
  hour: number;
  livestockMode: 'dairy' | 'beef';
}) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = L.DomUtil.create('canvas', 'leaflet-smooth-thermal-canvas') as HTMLCanvasElement;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '200';
    canvas.style.opacity = '0.70';
    canvas.style.mixBlendMode = 'screen';

    const pane = map.getPane('overlayPane');
    if (pane) pane.appendChild(canvas);
    canvasRef.current = canvas;

    const renderThermalField = () => {
      if (!canvasRef.current) return;
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, size.x, size.y);

      // Declinación solar estacional: oscila entre -23.4° (Diciembre) y +23.4° (Junio)
      const solarDeclination = -23.44 * Math.cos(((month + 0.5) / 12) * 2 * Math.PI);
      // Longitud solar donde es mediodía en UTC
      const solarNoonLon = (12 - hour) * 15;

      // 1. Capa Base Latitudinal Planetaria (Polo Frío <-> Trópico Cálido)
      const northPolePoint = map.latLngToContainerPoint([85, 0]);
      const equatorPoint = map.latLngToContainerPoint([solarDeclination, 0]);
      const southPolePoint = map.latLngToContainerPoint([-85, 0]);

      // Gradiente hemisferio Norte
      const northGrad = ctx.createLinearGradient(0, northPolePoint.y, 0, equatorPoint.y);
      northGrad.addColorStop(0, '#1E3A8A'); // Azul polar frío (-69)
      northGrad.addColorStop(0.35, '#3B82F6');
      northGrad.addColorStop(0.65, '#22C55E'); // Confort
      northGrad.addColorStop(0.85, '#EAB308'); // Alerta
      northGrad.addColorStop(1, '#DC2626');   // Trópico cálido

      ctx.fillStyle = northGrad;
      ctx.fillRect(0, Math.min(northPolePoint.y, equatorPoint.y), size.x, Math.abs(equatorPoint.y - northPolePoint.y));

      // Gradiente hemisferio Sur
      const southGrad = ctx.createLinearGradient(0, equatorPoint.y, 0, southPolePoint.y);
      southGrad.addColorStop(0, '#DC2626');
      southGrad.addColorStop(0.25, '#EAB308');
      southGrad.addColorStop(0.55, '#22C55E');
      southGrad.addColorStop(0.80, '#3B82F6');
      southGrad.addColorStop(1, '#1E3A8A');

      ctx.fillStyle = southGrad;
      ctx.fillRect(0, Math.min(equatorPoint.y, southPolePoint.y), size.x, Math.abs(southPolePoint.y - equatorPoint.y));

      // 2. Onda Solar Diurna del Mediodía (Recorre el mundo de este a oeste)
      const noonPoint = map.latLngToContainerPoint([solarDeclination, solarNoonLon]);
      const sunRadius = Math.max(size.x * 0.45, 300);

      const diurnalGrad = ctx.createRadialGradient(noonPoint.x, noonPoint.y, 20, noonPoint.x, noonPoint.y, sunRadius);
      diurnalGrad.addColorStop(0, 'rgba(185, 28, 28, 0.75)'); // Núcleo térmico solar máximo
      diurnalGrad.addColorStop(0.35, 'rgba(234, 179, 8, 0.45)');
      diurnalGrad.addColorStop(0.70, 'rgba(34, 197, 94, 0.15)');
      diurnalGrad.addColorStop(1, 'rgba(30, 58, 138, 0)');

      ctx.fillStyle = diurnalGrad;
      ctx.beginPath();
      ctx.arc(noonPoint.x, noonPoint.y, sunRadius, 0, Math.PI * 2);
      ctx.fill();

      // Efecto adicional de calentamiento global multianual
      if (year > 2030) {
        ctx.fillStyle = `rgba(220, 38, 38, ${Math.min(0.25, (year - 2030) * 0.003)})`;
        ctx.fillRect(0, 0, size.x, size.y);
      }
    };

    renderThermalField();

    map.on('moveend zoomend resize', renderThermalField);
    return () => {
      map.off('moveend zoomend resize', renderThermalField);
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
  t,
}: DepartmentHeatMapProps) {
  const [mounted, setMounted] = useState(false);

  // FILTRO TEMPORAL INDEPENDIENTE
  const [mapTimeScale, setMapTimeScale] = useState<'hour' | 'day' | 'month' | 'year'>('month');
  const [mapYear, setMapYear] = useState<number>(2024);
  const [mapMonth, setMapMonth] = useState<number>(new Date().getMonth());
  const [mapDay, setMapDay] = useState<number>(new Date().getDate());
  const [mapHour, setMapHour] = useState<number>(14);

  // REPRODUCTOR DE VIDEO SIMULADO
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Pin indicador para el predio del usuario
  const [markerIcon, setMarkerIcon] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    const icon = L.divIcon({
      className: 'custom-smooth-global-pin',
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: 0; border-radius: 50%; background: ${livestockMode === 'dairy' ? 'rgba(74, 222, 128, 0.45)' : 'rgba(239, 68, 68, 0.45)'}; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 14px; height: 14px; border-radius: 50%; background: ${livestockMode === 'dairy' ? '#4ADE80' : '#EF4444'}; border: 2.5px solid #FFFFFF; box-shadow: 0 0 12px rgba(0,0,0,0.9);"></div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
    setMarkerIcon(icon);
  }, [livestockMode]);

  // Animación del reproductor (Timelapse)
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        if (mapTimeScale === 'hour') {
          setMapHour((prev) => (prev + 1) % 24);
        } else if (mapTimeScale === 'day') {
          setMapDay((prev) => (prev >= 30 ? 1 : prev + 1));
        } else if (mapTimeScale === 'month') {
          setMapMonth((prev) => (prev + 1) % 12);
        } else if (mapTimeScale === 'year') {
          setMapYear((prev) => (prev >= 2060 ? 2020 : prev + 2));
        }
      }, 600);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, mapTimeScale]);

  if (!mounted) {
    return <div className="h-96 w-full bg-[#070D0A] rounded-3xl animate-pulse" />;
  }

  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const mesesCompletos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return (
    <div className="bg-[#0A110D] rounded-3xl border border-emerald-500/20 p-5 space-y-4 shadow-2xl">
      
      {/* Barra superior de controles del mapa */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            Distribución térmica global continua (Mundial)
          </h3>
          <p className="text-[11px] text-emerald-400/80 font-mono">
            {t('sim_active')}: {mapDay} de {mesesCompletos[mapMonth]} {mapYear} &bull; {mapHour}:00 UTC
          </p>
        </div>

        {/* Reproductor y Controles Temporales */}
        <div className="flex flex-wrap items-center gap-2">
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg ${
              isPlaying
                ? 'bg-amber-500 text-slate-950 shadow-amber-500/20'
                : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? t('pause') : t('play_sim')}
          </button>

          <div className="flex bg-black/60 p-1 rounded-xl border border-white/10 text-[11px]">
            {(['hour', 'day', 'month', 'year'] as const).map((scale) => (
              <button
                key={scale}
                onClick={() => setMapTimeScale(scale)}
                className={`px-2.5 py-0.5 rounded-lg font-bold capitalize transition ${
                  mapTimeScale === scale ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400'
                }`}
              >
                {scale === 'hour' ? 'Hora' : scale === 'day' ? 'Día' : scale === 'month' ? 'Mes' : 'Año'}
              </button>
            ))}
          </div>

          <select
            value={mapYear}
            onChange={(e) => setMapYear(Number(e.target.value))}
            className="bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
          >
            {[1990, 2000, 2010, 2020, 2024, 2026, 2030, 2040, 2050, 2060, 2100].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select
            value={mapMonth}
            onChange={(e) => setMapMonth(Number(e.target.value))}
            className="bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
          >
            {meses.map((m, idx) => (
              <option key={idx} value={idx}>{m}</option>
            ))}
          </select>

          <select
            value={mapHour}
            onChange={(e) => setMapHour(Number(e.target.value))}
            className="bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{i < 10 ? '0' : ''}{i}:00</option>
            ))}
          </select>
        </div>
      </div>

      {/* Contenedor Leaflet con ESRI (Sin marcas de agua y libre) */}
      <div className="relative h-96 w-full rounded-2xl overflow-hidden border border-emerald-500/20 bg-[#050B08]">
        <MapContainer
          center={[15, 0]}
          zoom={2}
          minZoom={1.5}
          maxZoom={9}
          maxBounds={[[-85, -180], [85, 180]]}
          scrollWheelZoom={true}
          className="w-full h-full z-10"
        >
          {/* Capa Cartográfica Oficial Esri Dark Gray (SIN API KEY Y SIN MARCAS DE AGUA) */}
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; World Dark Gray Base'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          />

          {/* Fronteras y etiquetas de países sobre el mapa */}
          <TileLayer
            attribution=''
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
          />

          {/* CAPA TÉRMICA CONTINUA Y SUAVE SOBRE TODOS LOS CONTINENTES */}
          <GlobalThermalSmoothLayer
            year={mapYear}
            month={mapMonth}
            hour={mapHour}
            livestockMode={livestockMode}
          />

          {/* Marcador del predio consultado */}
          {markerIcon && (
            <Marker position={[lat, lon]} icon={markerIcon}>
              <Popup>
                <div className="p-1 space-y-1 text-slate-800 text-xs font-sans">
                  <div className="font-bold flex items-center gap-1 text-slate-900">
                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                    {placeName}
                  </div>
                  <div>Coordenadas: {lat.toFixed(2)}°, {lon.toFixed(2)}°</div>
                  <div className="text-[11px] text-slate-600">
                    Simulación: {mapDay} de {mesesCompletos[mapMonth]} {mapYear} ({mapHour}:00 UTC)
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Indicador de simulación activa */}
        {isPlaying && (
          <div className="absolute top-3 right-3 z-[400] bg-black/85 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-500/40 text-[10px] font-bold text-emerald-400 flex items-center gap-1.5 shadow-xl animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Simulación global en reproducción ({mapTimeScale.toUpperCase()})
          </div>
        )}
      </div>

      {/* Escala Científica con primera letra en mayúscula */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between items-center text-[10px] font-bold text-slate-300">
          <span>Escala de estrés térmico global</span>
          <span className="text-emerald-400 font-mono">Modelo bioclimático planetario continuo</span>
        </div>
        <div
          className="h-2.5 w-full rounded-full shadow-inner"
          style={{
            background: 'linear-gradient(to right, #1E3A8A, #3B82F6, #22C55E, #FEF3C7, #F59E0B, #DC2626, #7F1D1D)'
          }}
        />
        <div className="flex justify-between text-[9px] text-slate-400 font-mono">
          <span>-69.3 (Frío polar)</span>
          <span>-34.7</span>
          <span>0.0 (Termoneutralidad)</span>
          <span>+34.7</span>
          <span>+52.0</span>
          <span className="text-red-400 font-bold">+69.3 (Estrés crítico)</span>
        </div>
      </div>

    </div>
  );
}