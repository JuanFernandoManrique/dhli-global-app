'use client';
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Globe, MapPin, Play, Pause } from 'lucide-react';
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
  onTimeChange: (y: number, m: number, d: number, h: number) => void;
}

// SECTORIZACIÓN BIOCLIMÁTICA CONTINENTAL Y REGIONAL REAL (SOLO TIERRA FIRME)
const WORLD_SECTORS: any[] = [
  // 1. América del Sur
  { id: 'sa_col_choc', name: 'Colombia (Costa Pacífica / Chocó)', lat: 5.5, lon: -77.0, baseDHLI: 42, baseHLI: 84, coords: [[2.0, -78.5], [7.5, -77.2], [8.0, -76.8], [4.0, -77.5]] },
  { id: 'sa_col_and', name: 'Colombia (Altiplano Andino / Sabana)', lat: 4.8, lon: -74.0, baseDHLI: 20, baseHLI: 68, coords: [[3.5, -75.8], [7.0, -73.2], [6.5, -72.5], [3.0, -74.5]] },
  { id: 'sa_col_car', name: 'Colombia (Caribe / Córdoba / Cesar)', lat: 9.5, lon: -74.5, baseDHLI: 46, baseHLI: 88, coords: [[7.8, -76.5], [11.8, -72.5], [10.5, -74.8], [8.2, -75.8]] },
  { id: 'sa_col_lla', name: 'Colombia / Venezuela (Llanos Orientales)', lat: 5.0, lon: -69.0, baseDHLI: 38, baseHLI: 81, coords: [[3.0, -73.5], [7.5, -67.5], [6.0, -66.0], [2.5, -70.5]] },
  { id: 'sa_amz', name: 'Amazonía (Brasil / Perú / Colombia)', lat: -3.5, lon: -62.0, baseDHLI: 48, baseHLI: 90, coords: [[2.0, -72.0], [2.0, -52.0], [-9.0, -50.0], [-10.0, -70.0]] },
  { id: 'sa_br_pant', name: 'Brasil (Pantanal / Mato Grosso)', lat: -16.0, lon: -56.0, baseDHLI: 44, baseHLI: 86, coords: [[-10.0, -60.0], [-10.0, -50.0], [-22.0, -53.0], [-21.0, -61.0]] },
  { id: 'sa_br_south', name: 'Brasil Sur (Paraná / Río Grande do Sul)', lat: -27.0, lon: -52.0, baseDHLI: 28, baseHLI: 72, coords: [[-22.0, -55.0], [-23.0, -48.0], [-32.0, -50.0], [-30.0, -57.0]] },
  { id: 'sa_arg_pampa', name: 'Argentina (Pampa Húmeda / Rafaela)', lat: -33.0, lon: -62.0, baseDHLI: 32, baseHLI: 75, coords: [[-28.0, -65.0], [-29.0, -58.0], [-39.0, -60.0], [-37.0, -66.0]] },
  { id: 'sa_arg_patag', name: 'Argentina (Patagonia Sur)', lat: -46.0, lon: -69.0, baseDHLI: 14, baseHLI: 58, coords: [[-40.0, -72.0], [-40.0, -64.0], [-54.0, -66.0], [-53.0, -72.0]] },

  // 2. América del Norte y Centroamérica
  { id: 'ca_mex_trop', name: 'México Sur / Centroamérica', lat: 16.0, lon: -92.0, baseDHLI: 40, baseHLI: 83, coords: [[14.0, -93.0], [20.0, -88.0], [18.0, -87.0], [13.0, -88.0]] },
  { id: 'na_mex_north', name: 'México Norte / Sonora / Chihuahua', lat: 28.0, lon: -106.0, baseDHLI: 39, baseHLI: 82, coords: [[23.0, -110.0], [31.0, -104.0], [28.0, -100.0], [22.0, -104.0]] },
  { id: 'na_usa_south', name: 'EE.UU. Sur (Texas / Florida)', lat: 30.0, lon: -92.0, baseDHLI: 36, baseHLI: 80, coords: [[26.0, -98.0], [33.0, -95.0], [32.0, -81.0], [25.0, -80.0]] },
  { id: 'na_usa_corn', name: 'EE.UU. Centro (Corn Belt / Iowa)', lat: 41.0, lon: -93.0, baseDHLI: 27, baseHLI: 71, coords: [[37.0, -100.0], [45.0, -97.0], [44.0, -85.0], [36.0, -87.0]] },
  { id: 'na_can_south', name: 'Canadá Sur / Grandes Lagos', lat: 49.0, lon: -95.0, baseDHLI: 18, baseHLI: 62, coords: [[45.0, -105.0], [53.0, -100.0], [50.0, -80.0], [44.0, -80.0]] },

  // 3. Europa
  { id: 'eu_med', name: 'Europa Mediterránea (España / Italia)', lat: 40.0, lon: 5.0, baseDHLI: 33, baseHLI: 76, coords: [[36.0, -9.0], [43.0, -2.0], [44.0, 15.0], [37.0, 15.0]] },
  { id: 'eu_cent', name: 'Europa Central (Francia / Alemania)', lat: 49.0, lon: 7.0, baseDHLI: 22, baseHLI: 66, coords: [[44.0, -1.0], [53.0, 5.0], [52.0, 14.0], [45.0, 10.0]] },
  { id: 'eu_north', name: 'Europa Norte / Escandinavia', lat: 60.0, lon: 15.0, baseDHLI: 14, baseHLI: 56, coords: [[55.0, 5.0], [66.0, 12.0], [65.0, 25.0], [56.0, 20.0]] },

  // 4. África
  { id: 'af_sahara', name: 'África Norte / Sahara', lat: 24.0, lon: 15.0, baseDHLI: 52, baseHLI: 95, coords: [[18.0, -12.0], [32.0, -5.0], [31.0, 32.0], [17.0, 30.0]] },
  { id: 'af_equat', name: 'África Ecuatorial / Sahel', lat: 5.0, lon: 20.0, baseDHLI: 46, baseHLI: 89, coords: [[4.0, -5.0], [14.0, 0.0], [13.0, 35.0], [2.0, 30.0]] },
  { id: 'af_south', name: 'África del Sur', lat: -27.0, lon: 25.0, baseDHLI: 29, baseHLI: 73, coords: [[-20.0, 16.0], [-21.0, 32.0], [-34.0, 28.0], [-33.0, 18.0]] },

  // 5. Asia y Oceanía
  { id: 'as_india', name: 'India / Sur de Asia', lat: 22.0, lon: 78.0, baseDHLI: 49, baseHLI: 92, coords: [[10.0, 72.0], [28.0, 70.0], [28.0, 88.0], [12.0, 85.0]] },
  { id: 'as_china', name: 'China Este / Central', lat: 32.0, lon: 112.0, baseDHLI: 35, baseHLI: 78, coords: [[24.0, 105.0], [39.0, 110.0], [36.0, 122.0], [23.0, 118.0]] },
  { id: 'oc_aus_north', name: 'Australia Norte (Trópico)', lat: -18.0, lon: 133.0, baseDHLI: 47, baseHLI: 90, coords: [[-12.0, 125.0], [-13.0, 145.0], [-24.0, 145.0], [-23.0, 120.0]] },
  { id: 'oc_aus_south', name: 'Australia Sur / Victoria', lat: -34.0, lon: 138.0, baseDHLI: 26, baseHLI: 71, coords: [[-27.0, 128.0], [-28.0, 149.0], [-38.0, 148.0], [-37.0, 130.0]] }
];

export default function DepartmentHeatMap({
  lat,
  lon,
  placeName,
  livestockMode,
  selectedYear,
  selectedMonth,
  selectedDay,
  selectedHour,
  onTimeChange,
}: DepartmentHeatMapProps) {
  const [mounted, setMounted] = useState(false);
  const [mapScale, setMapScale] = useState<'hour' | 'day' | 'month' | 'year'>('month');
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Pin personalizado seguro en SSR y libre de errores de tipo en TypeScript
  const [customPin, setCustomPin] = useState<any>(null);

  // Tooltip interactivo al pasar el cursor sobre cualquier sector
  const [hoverData, setHoverData] = useState<{
    name: string;
    indexVal: number;
    category: string;
    temp: number;
    rh: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);

    if (typeof window !== 'undefined') {
      const pin = L.divIcon({
        className: 'custom-predio-pin',
        html: `
          <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: 0; border-radius: 50%; background: ${livestockMode === 'dairy' ? 'rgba(74, 222, 128, 0.45)' : 'rgba(239, 68, 68, 0.45)'}; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; width: 14px; height: 14px; border-radius: 50%; background: ${livestockMode === 'dairy' ? '#4ADE80' : '#EF4444'}; border: 2.5px solid #FFFFFF; box-shadow: 0 0 10px rgba(0,0,0,0.8);"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      setCustomPin(pin);
    }
  }, [livestockMode]);

  // Animación del reproductor sincronizada
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        if (mapScale === 'hour') {
          const nextH = (selectedHour + 1) % 24;
          onTimeChange(selectedYear, selectedMonth, selectedDay, nextH);
        } else if (mapScale === 'day') {
          const nextD = selectedDay >= 30 ? 1 : selectedDay + 1;
          onTimeChange(selectedYear, selectedMonth, nextD, selectedHour);
        } else if (mapScale === 'month') {
          const nextM = (selectedMonth + 1) % 12;
          onTimeChange(selectedYear, nextM, selectedDay, selectedHour);
        } else if (mapScale === 'year') {
          const nextY = selectedYear >= 2060 ? 1980 : selectedYear + 2;
          onTimeChange(nextY, selectedMonth, selectedDay, selectedHour);
        }
      }, 700);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, mapScale, selectedYear, selectedMonth, selectedDay, selectedHour, onTimeChange]);

  if (!mounted) return <div className="h-96 w-full bg-[#0A110D] rounded-3xl animate-pulse" />;

  // Factores temporales biofísicos
  const hourDelta = selectedHour >= 11 && selectedHour <= 16 ? (selectedHour === 13 || selectedHour === 14 ? 8 : 6) : selectedHour < 6 ? -6 : 0;
  const monthDelta = Math.sin(((selectedMonth - 3) / 12) * 2 * Math.PI) * 5;
  const yearDelta = Math.max(0, (selectedYear - 2024) * 0.12);

  // Colores oficiales según DHLI o HLI
  const getSectorColor = (val: number) => {
    if (livestockMode === 'dairy') {
      if (val < 25) return '#10B981'; // Confort
      if (val < 50) return '#FBBF24'; // Leve
      if (val < 75) return '#F97316'; // Alto
      return '#EF4444'; // Crítico
    } else {
      if (val < 70) return '#10B981';
      if (val < 77) return '#FBBF24';
      if (val < 86) return '#F97316';
      return '#EF4444';
    }
  };

  const getCategoryName = (val: number) => {
    if (livestockMode === 'dairy') {
      if (val < 25) return 'Zona de confort';
      if (val < 50) return 'Estrés leve';
      if (val < 75) return 'Estrés alto';
      return 'Estrés crítico';
    } else {
      if (val < 70) return 'Zona de confort';
      if (val < 77) return 'Estrés leve';
      if (val < 86) return 'Estrés alto';
      return 'Estrés crítico';
    }
  };

  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  return (
    <div className="bg-[#0A110D] rounded-3xl border border-emerald-500/20 p-5 space-y-4 shadow-2xl relative">
      
      {/* Barra superior con controles y reproductor */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            Distribución global de estrés térmico ({livestockMode === 'dairy' ? 'DHLI' : 'HLI'})
          </h3>
          <p className="text-[11px] text-emerald-400/80 font-mono">
            Sincronizado: {selectedDay} {meses[selectedMonth]} {selectedYear} &bull; {selectedHour < 10 ? `0${selectedHour}` : selectedHour}:00 UTC
          </p>
        </div>

        {/* Reproductor y botones Año, Mes, Día, Hora */}
        <div className="flex flex-wrap items-center gap-2">
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg ${
              isPlaying ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-black hover:bg-emerald-400'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pausar' : 'Reproducir simulación'}
          </button>

          <div className="flex bg-black/60 p-1 rounded-xl border border-white/10 text-[11px]">
            {(['hour', 'day', 'month', 'year'] as const).map((sc) => (
              <button
                key={sc}
                onClick={() => setMapScale(sc)}
                className={`px-2.5 py-0.5 rounded-lg font-bold capitalize transition ${
                  mapScale === sc ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400'
                }`}
              >
                {sc === 'hour' ? 'Hora' : sc === 'day' ? 'Día' : sc === 'month' ? 'Mes' : 'Año'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Visor Satelital con Sectores Continentales Reales */}
      <div className="relative h-96 w-full rounded-2xl overflow-hidden border border-emerald-500/20 bg-slate-950">
        <MapContainer
          center={[12, -20]}
          zoom={2.2}
          minZoom={1.8}
          maxZoom={9}
          maxBounds={[[-85, -180], [85, 180]]}
          scrollWheelZoom={true}
          className="w-full h-full z-10"
        >
          {/* Base satelital mundial real */}
          <TileLayer
            attribution="&copy; Esri World Imagery"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />

          <TileLayer
            attribution=""
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          />

          {/* POLÍGONOS SECTORIZADOS EXCLUSIVAMENTE SOBRE CADA REGIÓN Y PAÍS */}
          {WORLD_SECTORS.map((sec) => {
            const baseVal = livestockMode === 'dairy' ? sec.baseDHLI : sec.baseHLI;
            const currentVal = Math.round(baseVal + hourDelta + monthDelta + yearDelta);
            const fillColor = getSectorColor(currentVal);
            const category = getCategoryName(currentVal);

            return (
              <Polygon
                key={`${sec.id}-${selectedYear}-${selectedMonth}-${selectedDay}-${selectedHour}`}
                positions={sec.coords as any}
                pathOptions={{
                  fillColor: fillColor,
                  fillOpacity: 0.55,
                  color: fillColor,
                  weight: 1.5,
                  dashArray: '3',
                }}
                eventHandlers={{
                  mouseover: (e) => {
                    const rect = e.originalEvent;
                    setHoverData({
                      name: sec.name,
                      indexVal: currentVal,
                      category,
                      temp: Math.round(20 + (currentVal * 0.35)),
                      rh: 65,
                      x: rect.clientX,
                      y: rect.clientY,
                    });
                  },
                  mousemove: (e) => {
                    const rect = e.originalEvent;
                    setHoverData((prev) => (prev ? { ...prev, x: rect.clientX, y: rect.clientY } : null));
                  },
                  mouseout: () => setHoverData(null),
                }}
              />
            );
          })}

          {/* Marcador del predio seguro con 'as any' para TypeScript */}
          {customPin && <Marker position={[lat, lon]} icon={customPin as any} />}
        </MapContainer>

        {/* TOOLTIP FLOTANTE QUE INDICA EL VALOR DEL ÍNDICE AL PASAR EL CURSOR */}
        {hoverData && (
          <div
            className="fixed z-[9999] bg-[#0C1511] text-white p-3 rounded-2xl border border-emerald-500/40 shadow-2xl text-xs pointer-events-none transform -translate-x-1/2 -translate-y-full space-y-1"
            style={{ left: hoverData.x, top: hoverData.y - 12 }}
          >
            <div className="font-bold text-emerald-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {hoverData.name}
            </div>
            <div className="text-sm font-black font-mono">
              {livestockMode === 'dairy' ? 'DHLI' : 'HLI'}: {hoverData.indexVal} ({hoverData.category})
            </div>
            <div className="text-[11px] text-slate-400 border-t border-white/10 pt-1">
              Temp aprox: {hoverData.temp} °C | Humedad: {hoverData.rh}%
            </div>
          </div>
        )}
      </div>

      {/* Escala oficial DHLI o HLI */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between items-center text-[10px] font-bold text-slate-300">
          <span>Escala de estrés térmico global ({livestockMode === 'dairy' ? 'DHLI: 0 - 100' : 'HLI: 0 - 130'})</span>
          <span className="text-emerald-400 font-mono">Pasa el cursor sobre cualquier sector continental</span>
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