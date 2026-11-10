'use client';
import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

interface EarthGlobeProps {
  onSelectLocation: (lat: number, lon: number) => void;
  selectedCoords: { lat: number; lng: number } | null;
  lang?: 'es' | 'en' | 'pt';
}

const COUNTRY_COORDS = [
  { es: 'Colombia', en: 'Colombia', pt: 'Colômbia', lat: 4.57, lng: -74.29 },
  { es: 'Brasil', en: 'Brazil', pt: 'Brasil', lat: -14.23, lng: -51.92 },
  { es: 'Argentina', en: 'Argentina', pt: 'Argentina', lat: -38.41, lng: -63.61 },
  { es: 'México', en: 'Mexico', pt: 'México', lat: 23.63, lng: -102.55 },
  { es: 'Estados Unidos', en: 'United States', pt: 'Estados Unidos', lat: 37.09, lng: -95.71 },
  { es: 'Canadá', en: 'Canada', pt: 'Canadá', lat: 56.13, lng: -106.34 },
  { es: 'Australia', en: 'Australia', pt: 'Austrália', lat: -25.27, lng: 133.77 },
  { es: 'Nueva Zelanda', en: 'New Zealand', pt: 'Nova Zelândia', lat: -40.90, lng: 174.88 },
  { es: 'España', en: 'Spain', pt: 'Espanha', lat: 40.46, lng: -3.74 },
  { es: 'Francia', en: 'France', pt: 'França', lat: 46.22, lng: 2.21 },
  { es: 'Alemania', en: 'Germany', pt: 'Alemanha', lat: 51.16, lng: 10.45 },
  { es: 'Reino Unido', en: 'United Kingdom', pt: 'Reino Unido', lat: 55.37, lng: -3.43 },
  { es: 'Italia', en: 'Italy', pt: 'Itália', lat: 41.87, lng: 12.56 },
  { es: 'Países Bajos', en: 'Netherlands', pt: 'Países Baixos', lat: 52.13, lng: 5.29 },
  { es: 'India', en: 'India', pt: 'Índia', lat: 20.59, lng: 78.96 },
  { es: 'China', en: 'China', pt: 'China', lat: 35.86, lng: 104.19 },
  { es: 'Japón', en: 'Japan', pt: 'Japão', lat: 36.20, lng: 138.25 },
  { es: 'Sudáfrica', en: 'South Africa', pt: 'África do Sul', lat: -30.55, lng: 22.93 },
  { es: 'Chile', en: 'Chile', pt: 'Chile', lat: -35.67, lng: -71.54 },
  { es: 'Perú', en: 'Peru', pt: 'Peru', lat: -9.19, lng: -75.01 },
  { es: 'Ecuador', en: 'Ecuador', pt: 'Equador', lat: -1.83, lng: -78.18 },
  { es: 'Uruguay', en: 'Uruguay', pt: 'Uruguai', lat: -32.52, lng: -55.76 },
  { es: 'Paraguay', en: 'Paraguay', pt: 'Paraguai', lat: -23.44, lng: -58.44 },
  { es: 'Bolivia', en: 'Bolivia', pt: 'Bolívia', lat: -16.29, lng: -63.58 },
  { es: 'Venezuela', en: 'Venezuela', pt: 'Venezuela', lat: 6.42, lng: -66.58 },
  { es: 'Costa Rica', en: 'Costa Rica', pt: 'Costa Rica', lat: 9.74, lng: -83.75 },
  { es: 'Panamá', en: 'Panama', pt: 'Panamá', lat: 8.53, lng: -80.78 },
  { es: 'Irlanda', en: 'Ireland', pt: 'Irlanda', lat: 53.14, lng: -7.69 },
  { es: 'Dinamarca', en: 'Denmark', pt: 'Dinamarca', lat: 56.26, lng: 9.50 },
  { es: 'Kenia', en: 'Kenya', pt: 'Quênia', lat: -0.02, lng: 37.90 },
];

export default function EarthGlobe({ onSelectLocation, selectedCoords, lang = 'es' }: EarthGlobeProps) {
  const globeRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (globeRef.current) {
      if (selectedCoords) {
        globeRef.current.controls().autoRotate = false;
        globeRef.current.pointOfView(
          { lat: selectedCoords.lat, lng: selectedCoords.lng, altitude: 0.35 },
          1200
        );
      } else {
        globeRef.current.controls().autoRotate = true;
        globeRef.current.controls().autoRotateSpeed = 0.6;
      }
    }
  }, [selectedCoords, mounted]);

  if (!mounted) {
    return (
      <div className="h-[480px] w-full bg-slate-950 flex items-center justify-center text-slate-500 rounded-3xl border border-slate-800">
        Cargando Globo 3D...
      </div>
    );
  }

  const htmlMarkers = [
    ...COUNTRY_COORDS.map((c) => ({
      type: 'country',
      name: c[lang] || c.es,
      lat: c.lat,
      lng: c.lng,
    })),
    ...(selectedCoords ? [{ type: 'pin', name: '', lat: selectedCoords.lat, lng: selectedCoords.lng }] : []),
  ];

  return (
    <div className="relative w-full h-[480px] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950 flex items-center justify-center">
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        htmlElementsData={htmlMarkers}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={(d: any) => (d.type === 'pin' ? 0.02 : 0.008)}
        htmlElement={(d: any) => {
          const el = document.createElement('div');
          if (d.type === 'country') {
            el.innerHTML = `
              <div style="transform: translate(-50%, -50%); pointer-events: none; white-space: nowrap;">
                <span style="color: rgba(255, 255, 255, 0.9); font-size: 11px; font-weight: 700; text-shadow: 0 1px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.8); font-family: sans-serif; letter-spacing: 0.3px;">
                  ${d.name}
                </span>
              </div>
            `;
          } else {
            el.innerHTML = `
              <div style="transform: translate(-50%, -100%); cursor: pointer; display: flex; flex-direction: column; align-items: center;">
                <div style="position: absolute; bottom: 0; width: 24px; height: 24px; background: rgba(16, 185, 129, 0.4); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <svg width="32" height="42" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.6));">
                  <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37258 18.6274 0 12 0Z" fill="#EF4444"/>
                  <circle cx="12" cy="11" r="5" fill="#FFFFFF"/>
                </svg>
              </div>
            `;
          }
          return el;
        }}

        onGlobeClick={({ lat, lng }) => {
          if (globeRef.current) {
            globeRef.current.controls().autoRotate = false;
            globeRef.current.pointOfView({ lat, lng, altitude: 0.35 }, 1000);
          }
          onSelectLocation(lat, lng);
        }}
      />
      <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md px-4 py-2 rounded-xl text-white text-xs border border-white/10 pointer-events-none flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        Haz clic en cualquier país o región del globo para iniciar el análisis
      </div>
    </div>
  );
}