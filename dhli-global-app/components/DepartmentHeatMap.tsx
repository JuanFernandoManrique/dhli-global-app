'use client';
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Globe, MapPin, Play, Pause, Compass } from 'lucide-react';
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

// Función auxiliar para obtener el centro geográfico real de cada país
function getFeatureCentroid(feature: any): [number, number] {
  try {
    let coords = feature.geometry.coordinates;
    while (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
      coords = coords[0];
    }
    let sumLat = 0, sumLon = 0, count = 0;
    const step = Math.max(1, Math.floor(coords.length / 15));
    for (let i = 0; i < coords.length; i += step) {
      sumLon += coords[i][0];
      sumLat += coords[i][1];
      count++;
    }
    return [sumLat / count, sumLon / count];
  } catch {
    return [0, 0];
  }
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
  onTimeChange,
}: DepartmentHeatMapProps) {
  const [mounted, setMounted] = useState(false);
  const [geoData, setGeoData] = useState<any>(null);
  const [loadingGeo, setLoadingGeo] = useState(true);

  // Escala para el reproductor animado (Hora, Día, Mes, Año)
  const [mapScale, setMapScale] = useState<'hour' | 'day' | 'month' | 'year'>('month');
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Pin indicador para el predio
  const [customPin, setCustomPin] = useState<any>(null);

  // Tooltip interactivo al pasar el cursor sobre cualquier país
  const [hoverData, setHoverData] = useState<{
    name: string;
    indexVal: number;
    category: string;
    temp: number;
    rh: number;
    x: number;
    y: number;
  } | null>(null);

  // Cargar las fronteras oficiales reales del mundo (Natural Earth GeoJSON)
  useEffect(() => {
    setMounted(true);

    async function loadRealWorldBorders() {
      try {
        const res = await fetch(
          'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson'
        );
        if (res.ok) {
          const data = await res.json();
          setGeoData(data);
        }
      } catch (err) {
        console.error('Error cargando fronteras mundiales:', err);
      } finally {
        setLoadingGeo(false);
      }
    }

    loadRealWorldBorders();

    if (typeof window !== 'undefined') {
      const pin = L.divIcon({
        className: 'custom-predio-pin',
        html: `
          <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: 0; border-radius: 50%; background: ${livestockMode === 'dairy' ? 'rgba(74, 222, 128, 0.5)' : 'rgba(239, 68, 68, 0.5)'}; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; width: 14px; height: 14px; border-radius: 50%; background: ${livestockMode === 'dairy' ? '#4ADE80' : '#EF4444'}; border: 2.5px solid #FFFFFF; box-shadow: 0 0 12px rgba(0,0,0,0.9);"></div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      setCustomPin(pin);
    }
  }, [livestockMode]);

  // Reproductor de simulación (Timelapse interactivo)
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
      }, 750);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, mapScale, selectedYear, selectedMonth, selectedDay, selectedHour, onTimeChange]);

  if (!mounted) return <div className="h-96 w-full bg-[#0A110D] rounded-3xl animate-pulse" />;

  // Factores astronómicos y bioclimáticos reales
  const solarDeclination = -23.44 * Math.cos(((selectedMonth + 0.5) / 12) * 2 * Math.PI);
  const solarNoonLon = (12 - selectedHour) * 15;
  const warmingDelta = Math.max(0, (selectedYear - 2024) * 0.12);

  // Cálculo individual para cada país según su posición geográfica real
  const calculateCountryStress = (countryLat: number, countryLon: number) => {
    const effectiveLat = countryLat - solarDeclination;
    const latFactor = Math.cos((effectiveLat * Math.PI) / 180);

    let lonDiff = Math.abs(countryLon - solarNoonLon);
    if (lonDiff > 180) lonDiff = 360 - lonDiff;
    const diurnal = Math.max(0, Math.cos((lonDiff * Math.PI) / 180));

    let indexVal = 0;
    if (livestockMode === 'dairy') {
      indexVal = (latFactor * 38 - 8) + (diurnal * 22) + warmingDelta;
      if (countryLat > 60 || countryLat < -55) indexVal -= 25; // Polos
      indexVal = Math.max(0, Math.min(100, Math.round(indexVal)));
    } else {
      indexVal = (latFactor * 52 + 35) + (diurnal * 26) + warmingDelta;
      if (countryLat > 60 || countryLat < -55) indexVal -= 30;
      indexVal = Math.max(0, Math.min(130, Math.round(indexVal)));
    }

    const tempEst = +(latFactor * 30 - 2 + diurnal * 7 + warmingDelta * 0.3).toFixed(1);
    const rhEst = Math.round(Math.max(30, Math.min(90, 75 - diurnal * 18)));

    return { indexVal, tempEst, rhEst };
  };

  const getStressColor = (val: number) => {
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

  const getCategoryText = (val: number) => {
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

  // Estilo individual sobre la forma real de cada país
  const styleCountryFeature = (feature: any) => {
    const [cLat, cLon] = getFeatureCentroid(feature);
    const { indexVal } = calculateCountryStress(cLat, cLon);
    const color = getStressColor(indexVal);

    return {
      fillColor: color,
      fillOpacity: 0.52,
      color: '#4ADE80',
      weight: 1,
      opacity: 0.8,
    };
  };

  const onEachCountryFeature = (feature: any, layer: any) => {
    const countryName =
      feature.properties?.name ||
      feature.properties?.NAME ||
      feature.properties?.ADMIN ||
      feature.properties?.formal_en ||
      'País';

    const [cLat, cLon] = getFeatureCentroid(feature);
    const { indexVal, tempEst, rhEst } = calculateCountryStress(cLat, cLon);
    const category = getCategoryText(indexVal);

    layer.on({
      mouseover: (e: any) => {
        const ev = e.originalEvent;
        setHoverData({
          name: countryName,
          indexVal,
          category,
          temp: tempEst,
          rh: rhEst,
          x: ev.clientX,
          y: ev.clientY,
        });
        layer.setStyle({ fillOpacity: 0.75, weight: 2, color: '#FFFFFF' });
      },
      mousemove: (e: any) => {
        const ev = e.originalEvent;
        setHoverData((prev) => (prev ? { ...prev, x: ev.clientX, y: ev.clientY } : null));
      },
      mouseout: () => {
        setHoverData(null);
        layer.setStyle({ fillOpacity: 0.52, weight: 1, color: '#4ADE80' });
      },
    });
  };

  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  return (
    <div className="bg-[#0A110D] rounded-3xl border border-emerald-500/20 p-5 space-y-4 shadow-2xl relative">
      
      {/* Cabecera de controles sincronizados */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            Distribución global de estrés térmico ({livestockMode === 'dairy' ? 'DHLI' : 'HLI'})
          </h3>
          <p className="text-[11px] text-emerald-400/80 font-mono">
            Sincronizado: {selectedDay} {meses[selectedMonth]} {selectedYear} &bull; {selectedHour < 10 ? `0${selectedHour}` : selectedHour}:00 UTC
            {loadingGeo && <span className="ml-2 text-amber-400 animate-pulse">(Cargando fronteras...)</span>}
          </p>
        </div>

        {/* Reproductor y Botones de Escala (Hora, Día, Mes, Año) */}
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

      {/* Visor con Fronteras Reales (Sin cuadros recortados y sin calor en el océano) */}
      <div className="relative h-96 w-full rounded-2xl overflow-hidden border border-emerald-500/20 bg-slate-950">
        <MapContainer
          center={[14, 0]}
          zoom={2.2}
          minZoom={1.8}
          maxZoom={9}
          maxBounds={[[-85, -180], [85, 180]]}
          scrollWheelZoom={true}
          className="w-full h-full z-10"
        >
          {/* Base satelital limpia */}
          <TileLayer
            attribution="&copy; Esri World Imagery"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />

          {/* CAPA VECTORIAL CON LAS FORMAS GEOGRÁFICAS REALES DE CADA PAÍS */}
          {geoData && (
            <GeoJSON
              key={`${selectedYear}-${selectedMonth}-${selectedDay}-${selectedHour}-${livestockMode}`}
              data={geoData}
              style={styleCountryFeature}
              onEachFeature={onEachCountryFeature}
            />
          )}

          {/* Marcador del predio consultado */}
          {customPin && <Marker position={[lat, lon]} icon={customPin as any} />}
        </MapContainer>

        {/* TOOLTIP DINÁMICO AL PASAR EL CURSOR SOBRE CUALQUIER PAÍS */}
        {hoverData && (
          <div
            className="fixed z-[9999] bg-[#0C1511] text-white p-3 rounded-2xl border border-emerald-500/40 shadow-2xl text-xs pointer-events-none transform -translate-x-1/2 -translate-y-full space-y-1 backdrop-blur-md"
            style={{ left: hoverData.x, top: hoverData.y - 12 }}
          >
            <div className="font-bold text-emerald-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {hoverData.name}
            </div>
            <div className="text-sm font-black font-mono">
              {livestockMode === 'dairy' ? 'DHLI' : 'HLI'}: {hoverData.indexVal} ({hoverData.category})
            </div>
            <div className="text-[11px] text-slate-400 border-t border-white/10 pt-1">
              Temp estimada: {hoverData.temp} °C | Humedad: {hoverData.rh}%
            </div>
          </div>
        )}
      </div>

      {/* Escala oficial */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between items-center text-[10px] font-bold text-slate-300">
          <span>Escala de estrés térmico global ({livestockMode === 'dairy' ? 'DHLI: 0 - 100' : 'HLI: 0 - 130'})</span>
          <span className="text-emerald-400 font-mono">Pasa el cursor sobre cualquier país para ver su índice</span>
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