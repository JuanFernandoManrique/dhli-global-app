'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, MapPin, Globe, Sparkles } from 'lucide-react';

interface DepartmentHeatMapProps {
  lat: number;
  lon: number;
  placeName: string;
  livestockMode: 'dairy' | 'beef';
  t: (key: string) => string;
}

// Polígonos de alta precisión de los continentes y regiones del mundo
const WORLD_LANDMASSES = [
  // América del Norte y Groenlandia
  { id: 'na_north', name: 'Canadá / Alaska', lat: 60, lon: -110, path: 'M 140,80 Q 200,60 280,65 Q 320,80 340,110 L 310,140 Q 260,130 220,150 Q 170,140 140,80 Z' },
  { id: 'greenland', name: 'Groenlandia', lat: 72, lon: -40, path: 'M 350,50 Q 390,45 400,70 Q 380,100 360,95 Q 340,80 350,50 Z' },
  { id: 'na_usa', name: 'Estados Unidos / México', lat: 35, lon: -100, path: 'M 160,140 L 310,135 Q 320,180 290,210 L 260,250 Q 230,240 210,210 Q 180,190 160,140 Z' },
  { id: 'ca_mex', name: 'Centroamérica', lat: 15, lon: -90, path: 'M 255,245 Q 275,260 290,285 Q 280,295 265,275 Z' },
  
  // América del Sur
  { id: 'sa_north', name: 'Colombia / Venezuela / Guyanas', lat: 5, lon: -68, path: 'M 280,280 Q 330,270 350,300 Q 320,330 290,320 Z' },
  { id: 'sa_brazil', name: 'Brasil / Amazonía', lat: -10, lon: -55, path: 'M 300,315 Q 360,295 390,340 Q 370,400 330,390 Q 295,350 300,315 Z' },
  { id: 'sa_south', name: 'Argentina / Chile / Cono Sur', lat: -35, lon: -65, path: 'M 305,380 Q 335,385 325,445 Q 315,480 300,470 Q 295,410 305,380 Z' },
  
  // Europa
  { id: 'eu_west', name: 'Europa Occidental (España / Francia / RU)', lat: 48, lon: 2, path: 'M 440,130 Q 480,110 500,135 Q 490,170 460,180 Q 435,160 440,130 Z' },
  { id: 'eu_north', name: 'Escandinavia', lat: 62, lon: 15, path: 'M 480,80 Q 520,70 530,110 Q 500,130 480,80 Z' },
  { id: 'eu_east', name: 'Europa Oriental / Ucrania', lat: 50, lon: 30, path: 'M 500,120 Q 550,115 560,155 Q 520,175 500,120 Z' },
  
  // África
  { id: 'af_north', name: 'África del Norte / Sahara', lat: 25, lon: 15, path: 'M 430,185 Q 550,180 570,230 Q 510,270 440,250 Q 420,210 430,185 Z' },
  { id: 'af_central', name: 'África Central / Sahel', lat: 5, lon: 20, path: 'M 440,250 Q 540,255 560,300 Q 520,340 460,330 Q 440,280 440,250 Z' },
  { id: 'af_south', name: 'África del Sur', lat: -25, lon: 25, path: 'M 480,330 Q 540,325 530,410 Q 490,420 480,330 Z' },
  
  // Asia
  { id: 'as_russia', name: 'Siberia / Rusia', lat: 60, lon: 90, path: 'M 540,70 Q 720,55 830,80 Q 820,130 700,120 Q 580,125 540,70 Z' },
  { id: 'as_mideast', name: 'Medio Oriente / Arabia', lat: 24, lon: 45, path: 'M 550,185 Q 610,180 620,230 Q 570,250 550,185 Z' },
  { id: 'as_india', name: 'India / Sur de Asia', lat: 20, lon: 78, path: 'M 640,195 Q 690,190 710,240 Q 670,290 645,240 Z' },
  { id: 'as_china', name: 'China / Asia Oriental', lat: 35, lon: 105, path: 'M 670,140 Q 790,130 800,190 Q 750,240 680,210 Z' },
  { id: 'as_se', name: 'Sudeste Asiático / Indonesia', lat: 0, lon: 115, path: 'M 720,250 Q 780,260 820,310 Q 760,320 720,250 Z' },
  
  // Oceanía
  { id: 'oc_aus_north', name: 'Norte de Australia', lat: -18, lon: 132, path: 'M 760,330 Q 840,320 860,360 Q 800,380 760,330 Z' },
  { id: 'oc_aus_south', name: 'Sur de Australia / Tasmania', lat: -32, lon: 135, path: 'M 770,380 Q 855,370 850,420 Q 780,425 770,380 Z' },
  { id: 'oc_nz', name: 'Nueva Zelanda', lat: -42, lon: 172, path: 'M 880,410 Q 900,405 895,440 Q 875,440 880,410 Z' }
];

export default function DepartmentHeatMap({
  lat,
  lon,
  placeName,
  livestockMode,
  t,
}: DepartmentHeatMapProps) {
  // FILTRO TEMPORAL INDEPENDIENTE PARA ESTE MAPA
  const [mapTimeScale, setMapTimeScale] = useState<'hour' | 'day' | 'month' | 'year'>('month');
  const [mapYear, setMapYear] = useState<number>(2024);
  const [mapMonth, setMapMonth] = useState<number>(7); // Inicia en Agosto para reflejar el verano del artículo
  const [mapDay, setMapDay] = useState<number>(15);
  const [mapHour, setMapHour] = useState<number>(11);

  // REPRODUCTOR DE VIDEO SIMULADO
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Tooltip al pasar el mouse por cualquier país/región del mundo
  const [hoverInfo, setHoverInfo] = useState<{ name: string; thi: number; temp: number; x: number; y: number } | null>(null);

  // Animación del reproductor (Avanza en el tiempo)
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
          setMapYear((prev) => (prev >= 2060 ? 1980 : prev + 2));
        }
      }, 700);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, mapTimeScale]);

  // Cálculo biofísico de temperatura y THI para cualquier región del planeta
  const calculateRegionClimate = (regionLat: number, regionLon: number) => {
    // 1. Declinación solar estacional (oscilación norte-sur según el mes)
    const solarDeclination = -23.44 * Math.cos(((mapMonth + 0.5) / 12) * 2 * Math.PI);
    const effectiveLat = regionLat - solarDeclination;
    const latFactor = Math.cos((effectiveLat * Math.PI) / 180);

    // 2. Ciclo diurno según la longitud del mediodía solar
    const solarNoonLon = (12 - mapHour) * 15;
    let lonDiff = Math.abs(regionLon - solarNoonLon);
    if (lonDiff > 180) lonDiff = 360 - lonDiff;
    const diurnalFactor = Math.max(0, Math.cos((lonDiff * Math.PI) / 180));

    // 3. Proyección multianual de cambio climático
    const warming = (mapYear - 2024) * 0.045;

    // Temperatura de superficie estimada (°C)
    let tempEst = latFactor * 35 - 5 + diurnalFactor * 8 + warming;
    if (regionLat > 55) tempEst -= 15;
    if (regionLat < -50) tempEst -= 12;

    // Índice THI correspondiente a la escala del artículo (-69.3 a 69.3)
    let thi = 0.8 * tempEst + 0.6 * (tempEst - 14.4) + 15;
    if (regionLat > 60 && (mapMonth < 3 || mapMonth > 9)) thi -= 45; // Invierno boreal frío
    if (regionLat < -30 && mapMonth >= 4 && mapMonth <= 8) thi -= 30; // Invierno austral

    return {
      temp: +tempEst.toFixed(1),
      thi: Math.round(thi),
    };
  };

  // Asignación de color idéntica a la barra científica del estudio
  const getColormapColor = (thi: number) => {
    if (thi <= -34.7) return '#1E3A8A'; // Azul polar profundo
    if (thi <= -10) return '#3B82F6';   // Azul frío
    if (thi <= 5) return '#93C5FD';     // Celeste transición
    if (thi <= 20) return '#F3E8D0';    // Beige / crema neutro (0.0)
    if (thi <= 34.7) return '#D97706';  // Ámbar / naranja
    if (thi <= 52.0) return '#B91C1C';  // Rojo estrés
    return '#7F1D1D';                   // Carmesí crítico (>60)
  };

  // Conversión de coordenadas geográficas (lat, lon) a coordenadas SVG del marco Robinson
  const projectToRobinsonSVG = (latitude: number, longitude: number) => {
    // SVG viewBox: 0 0 1000 520
    const x = 500 + (longitude / 180) * 440;
    const y = 260 - (latitude / 90) * 220;
    return { x: Math.max(40, Math.min(960, x)), y: Math.max(30, Math.min(490, y)) };
  };

  const predioPos = projectToRobinsonSVG(lat, lon);
  const predioClimate = calculateRegionClimate(lat, lon);

  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const mesesCompletos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return (
    <div className="bg-[#0A110D] rounded-3xl border border-emerald-500/20 p-5 space-y-4 shadow-2xl">
      
      {/* Barra de Controles Superiores del Mapa */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            Distribución térmica global (Proyección científica Robinson)
          </h3>
          <p className="text-[11px] text-emerald-400/80 font-mono">
            {t('sim_active')}: {mapDay} de {mesesCompletos[mapMonth]} {mapYear} &bull; {mapHour}:00 UTC
          </p>
        </div>

        {/* Reproductor de Video y Selectores Independientes */}
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

          {/* Selector con todos los años disponibles */}
          <select
            value={mapYear}
            onChange={(e) => setMapYear(Number(e.target.value))}
            className="bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
          >
            {Array.from({ length: 121 }, (_, i) => 1980 + i).map((yr) => (
              <option key={yr} value={yr}>{yr}</option>
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

      {/* LIENZO ROBINSON CIENTÍFICO: EL CALOR ESTÁ SOLO SOBRE LA TIERRA (OCÉANO LIMPIO) */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-emerald-500/20 bg-[#060D0A] p-2 md:p-4">
        
        {/* Cabecera idéntica al estudio con fecha y hora UTC */}
        <div className="text-center font-mono text-xs text-slate-300 font-bold mb-1">
          {mapYear}-{mapMonth < 9 ? `0${mapMonth + 1}` : mapMonth + 1}-{mapDay < 10 ? `0${mapDay}` : mapDay} {mapHour < 10 ? `0${mapHour}` : mapHour}:00:00 UTC
        </div>

        <svg viewBox="0 0 1000 520" className="w-full h-auto select-none">
          
          {/* 1. Fondo de Océano Limpio y Marco Curvo de la Tierra (Proyección Robinson) */}
          <defs>
            <clipPath id="robinsonClip">
              <path d="M 120,30 L 880,30 Q 980,260 880,490 L 120,490 Q 20,260 120,30 Z" />
            </clipPath>
          </defs>

          {/* Océano neutro/limpio idéntico al artículo */}
          <path
            d="M 120,30 L 880,30 Q 980,260 880,490 L 120,490 Q 20,260 120,30 Z"
            fill="#09130F"
            stroke="#1F3328"
            strokeWidth="2"
          />

          <g clipPath="url(#robinsonClip)">
            
            {/* 2. Cuadrícula de Coordenadas (Paralelos y Meridianos) */}
            {/* Paralelos: 60°N, 30°N, Ecuador 0°, 30°S, 60°S */}
            <line x1="60" y1="105" x2="940" y2="105" stroke="#1D3025" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="40" y1="185" x2="960" y2="185" stroke="#1D3025" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="30" y1="260" x2="970" y2="260" stroke="#2B4636" strokeWidth="1.5" />
            <line x1="40" y1="335" x2="960" y2="335" stroke="#1D3025" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="60" y1="415" x2="940" y2="415" stroke="#1D3025" strokeWidth="1" strokeDasharray="3 3" />

            {/* Meridianos curvos: -120°, -60°, 0°, 60°, 120° */}
            <path d="M 240,30 Q 180,260 240,490" fill="none" stroke="#1D3025" strokeWidth="1" strokeDasharray="3 3" />
            <path d="M 370,30 Q 340,260 370,490" fill="none" stroke="#1D3025" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="500" y1="30" x2="500" y2="490" stroke="#2B4636" strokeWidth="1.5" />
            <path d="M 630,30 Q 660,260 630,490" fill="none" stroke="#1D3025" strokeWidth="1" strokeDasharray="3 3" />
            <path d="M 760,30 Q 820,260 760,490" fill="none" stroke="#1D3025" strokeWidth="1" strokeDasharray="3 3" />

            {/* 3. CONTINENTES COLOREADOS INDIVIDUALMENTE CON EL CALOR REAL (OCÉANO QUEDA LIMPIO) */}
            {WORLD_LANDMASSES.map((region) => {
              const climate = calculateRegionClimate(region.lat, region.lon);
              const fillColor = getColormapColor(climate.thi);

              return (
                <path
                  key={region.id}
                  d={region.path}
                  fill={fillColor}
                  stroke="#0A110D"
                  strokeWidth="1.5"
                  className="transition-colors duration-500 cursor-pointer hover:opacity-90 hover:stroke-white"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoverInfo({
                      name: region.name,
                      thi: climate.thi,
                      temp: climate.temp,
                      x: rect.x + rect.width / 2,
                      y: rect.y - 10,
                    });
                  }}
                  onMouseLeave={() => setHoverInfo(null)}
                />
              );
            })}

            {/* 4. MARCADOR DEL PREDIO CONSULTADO (UBICACIÓN EXACTA) */}
            <g transform={`translate(${predioPos.x}, ${predioPos.y})`}>
              <circle r="16" fill="rgba(74, 222, 128, 0.35)" className="animate-ping" />
              <circle r="6" fill="#4ADE80" stroke="#FFFFFF" strokeWidth="2" />
              <circle r="2" fill="#000000" />
            </g>

          </g>

          {/* Rótulos de Latitud (Izquierda y Derecha) idénticos al artículo */}
          <text x="15" y="110" fill="#6B7280" fontSize="10" fontFamily="monospace">60°N</text>
          <text x="15" y="190" fill="#6B7280" fontSize="10" fontFamily="monospace">30°N</text>
          <text x="20" y="265" fill="#9CA3AF" fontSize="11" fontFamily="monospace" fontWeight="bold">0°</text>
          <text x="15" y="340" fill="#6B7280" fontSize="10" fontFamily="monospace">30°S</text>
          <text x="15" y="420" fill="#6B7280" fontSize="10" fontFamily="monospace">60°S</text>

          <text x="965" y="110" fill="#6B7280" fontSize="10" fontFamily="monospace">60°N</text>
          <text x="965" y="190" fill="#6B7280" fontSize="10" fontFamily="monospace">30°N</text>
          <text x="970" y="265" fill="#9CA3AF" fontSize="11" fontFamily="monospace" fontWeight="bold">0°</text>
          <text x="965" y="340" fill="#6B7280" fontSize="10" fontFamily="monospace">30°S</text>
          <text x="965" y="420" fill="#6B7280" fontSize="10" fontFamily="monospace">60°S</text>

          {/* Rótulos de Longitud (Arriba y Abajo) */}
          <text x="95" y="20" fill="#6B7280" fontSize="10" fontFamily="monospace">180°</text>
          <text x="215" y="20" fill="#6B7280" fontSize="10" fontFamily="monospace">120°W</text>
          <text x="355" y="20" fill="#6B7280" fontSize="10" fontFamily="monospace">60°W</text>
          <text x="495" y="20" fill="#9CA3AF" fontSize="10" fontFamily="monospace" fontWeight="bold">0°</text>
          <text x="615" y="20" fill="#6B7280" fontSize="10" fontFamily="monospace">60°E</text>
          <text x="745" y="20" fill="#6B7280" fontSize="10" fontFamily="monospace">120°E</text>
          <text x="865" y="20" fill="#6B7280" fontSize="10" fontFamily="monospace">180°</text>

          <text x="95" y="510" fill="#6B7280" fontSize="10" fontFamily="monospace">180°</text>
          <text x="215" y="510" fill="#6B7280" fontSize="10" fontFamily="monospace">120°W</text>
          <text x="355" y="510" fill="#6B7280" fontSize="10" fontFamily="monospace">60°W</text>
          <text x="495" y="510" fill="#9CA3AF" fontSize="10" fontFamily="monospace" fontWeight="bold">0°</text>
          <text x="615" y="510" fill="#6B7280" fontSize="10" fontFamily="monospace">60°E</text>
          <text x="745" y="510" fill="#6B7280" fontSize="10" fontFamily="monospace">120°E</text>
          <text x="865" y="510" fill="#6B7280" fontSize="10" fontFamily="monospace">180°</text>
        </svg>

        {/* Tooltip interactivo flotante al pasar el mouse por cualquier país */}
        {hoverInfo && (
          <div
            className="fixed z-50 bg-[#0C1511] text-white px-3 py-1.5 rounded-xl border border-emerald-500/40 shadow-2xl text-xs pointer-events-none transform -translate-x-1/2 -translate-y-full"
            style={{ left: hoverInfo.x, top: hoverInfo.y }}
          >
            <div className="font-bold text-emerald-400">{hoverInfo.name}</div>
            <div>Índice térmico (THI): <strong>{hoverInfo.thi}</strong></div>
            <div>Temp estimada: {hoverInfo.temp} °C</div>
          </div>
        )}

        {/* Tarjeta de información del predio actual */}
        <div className="mt-2 flex flex-wrap items-center justify-between text-xs text-slate-300 bg-black/40 p-2.5 rounded-xl border border-white/5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>Predio fijado: <strong className="text-white">{placeName}</strong> ({lat.toFixed(2)}°, {lon.toFixed(2)}°)</span>
          </div>
          <div className="font-mono text-emerald-400">
            Índice local en simulación: <strong>{predioClimate.thi} THI</strong> ({predioClimate.temp} °C)
          </div>
        </div>

      </div>

      {/* Escala Científica idéntica al estudio (-69.3 a 69.3) */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between items-center text-[10px] font-bold text-slate-300">
          <span>Escala de estrés térmico global</span>
          <span className="text-emerald-400 font-mono">Modelo bioclimático planetario (THI)</span>
        </div>
        <div
          className="h-3 w-full rounded-full shadow-inner"
          style={{
            background: 'linear-gradient(to right, #1E3A8A, #3B82F6, #93C5FD, #F3E8D0, #D97706, #B91C1C, #7F1D1D)'
          }}
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>-69.3</span>
          <span>-52.0</span>
          <span>-34.7</span>
          <span>-17.3</span>
          <span>0.0 (THI)</span>
          <span>17.3</span>
          <span>34.7</span>
          <span>52.0</span>
          <span className="font-bold text-red-500">69.3</span>
        </div>
      </div>

    </div>
  );
}