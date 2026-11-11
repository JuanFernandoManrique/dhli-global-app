'use client';
import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { getWeatherData, reverseGeocode } from '../lib/weather-api';
import { estimateBGT, calculateDHLI, calculateHLI_Beef, LivestockMode, DairyBreedType, BeefBreedType, YieldLevel } from '../lib/dhli-calculator';
import { initialNewsFeed, NewsItem } from '../lib/news-feed';
import AiChatbot from '../components/AiChatbot';
import { Search, MapPin, Sliders, Thermometer, Wind, Droplets, Sun, Calendar, Clock, TrendingUp, Globe2, Map as MapIcon, ChevronRight, RotateCcw, Navigation, Languages, Trees, Download, Printer, Moon, DollarSign, MessageCircle, Settings, Beef, Milk, BookOpen, Upload, ExternalLink, PlusCircle, Trash2, Image as ImageIcon, Sparkles } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, LineChart, Line, ReferenceLine } from 'recharts';

const EarthGlobe = dynamic(() => import('../components/EarthGlobe'), { ssr: false });
const FarmMap = dynamic(() => import('../components/FarmMap'), { ssr: false });

export default function HomePage() {
  const [lang, setLang] = useState<'es' | 'en' | 'pt'>('es');
  const [livestockMode, setLivestockMode] = useState<LivestockMode>('dairy');

  // Ubicación y Coordenadas
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [placeName, setPlaceName] = useState<string>('Selecciona un punto en el globo terráqueo o busca un municipio');
  const [lat, setLat] = useState<number>(4.57);
  const [lon, setLon] = useState<number>(-74.29);
  const [manualLat, setManualLat] = useState<string>('');
  const [manualLon, setManualLon] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Configuración del Hato
  const [hasShade, setHasShade] = useState<boolean>(false);
  const [dairyBreed, setDairyBreed] = useState<DairyBreedType>('holstein');
  const [beefBreed, setBeefBreed] = useState<BeefBreedType>('angus');
  const [yieldLevel, setYieldLevel] = useState<YieldLevel>('medium');
  const [scenario, setScenario] = useState<'ssp245' | 'ssp585'>('ssp245');
  const [showHerdModal, setShowHerdModal] = useState<boolean>(false);
  const [nightCoolingHours, setNightCoolingHours] = useState<number>(6);

  // Módulo Financiero
  const [showFinanceModal, setShowFinanceModal] = useState<boolean>(false);
  const [animalCount, setAnimalCount] = useState<number>(80);
  const [unitPrice, setUnitPrice] = useState<number>(2200);
  const [currencySymbol, setCurrencySymbol] = useState<string>('COP ($)');
  const [mitigationCost, setMitigationCost] = useState<number>(8000000);

  // Vistas
  const [showCoordsPanel, setShowCoordsPanel] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mapMode, setMapMode] = useState<'globe' | 'satellite'>('globe');

  // Filtro temporal en 4 clics
  const [filterYear, setFilterYear] = useState<number>(2024);
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth());
  const [filterDay, setFilterDay] = useState<number>(new Date().getDate());
  const [filterHour, setFilterHour] = useState<number>(14);

  // Series
  const [yearsList, setYearsList] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<any | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<any | null>(null);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);

  // Variables Climáticas
  const [temp, setTemp] = useState(20);
  const [rh, setRh] = useState(70);
  const [ws, setWs] = useState(2);
  const [sr, setSr] = useState(400);

  // Panel de Noticias Administrable (Persistente en memoria)
  const [newsList, setNewsList] = useState<NewsItem[]>(initialNewsFeed);
  const [activeNewsIdx, setActiveNewsIdx] = useState(0);
  const [showNewsAdminModal, setShowNewsAdminModal] = useState(false);

  // Formulario para nuevo anuncio
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Noticia');
  const [newSummary, setNewSummary] = useState('');
  const [newImagePreview, setNewImagePreview] = useState('');
  const newsImageInputRef = useRef<HTMLInputElement>(null);

  // Modal del Manual y PDF persistente
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualPdfUrl, setManualPdfUrl] = useState<string | null>(null);

  // Cargar noticias y manual guardados previamente
  useEffect(() => {
    try {
      const savedNews = localStorage.getItem('dhli_custom_news');
      if (savedNews) setNewsList(JSON.parse(savedNews));

      const savedPdf = localStorage.getItem('dhli_manual_pdf_data');
      if (savedPdf) setManualPdfUrl(savedPdf);
    } catch {}
  }, []);

  // Rotación suave del carrusel
  useEffect(() => {
    if (newsList.length <= 1) return;
    const interval = setInterval(() => {
      setActiveNewsIdx((prev) => (prev + 1) % newsList.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [newsList.length]);

  const currentBGT = estimateBGT(temp, rh, ws, sr, hasShade);
  const result = livestockMode === 'dairy'
    ? calculateDHLI(currentBGT, rh, lang, dairyBreed, yieldLevel)
    : calculateHLI_Beef(currentBGT, rh, ws, lang, beefBreed);

  const dailyPhysicalLost = livestockMode === 'dairy'
    ? (result as any).milkLoss * animalCount
    : (result as any).adgLoss * animalCount;

  const dailyMoneyLost = dailyPhysicalLost * unitPrice;
  const monthlyMoneyLost = dailyMoneyLost * 30;
  const roiMonths = dailyMoneyLost > 0 ? (mitigationCost / monthlyMoneyLost).toFixed(1) : 'N/A';

  // Función para seleccionar un lugar encontrado en el buscador
  const handleSelectPlace = (item: any) => {
    const newLat = parseFloat(item.lat);
    const newLon = parseFloat(item.lon);
    const name = item.display_name.split(',').slice(0, 3).join(', ');
    setSearchQuery('');
    setSearchResults([]);
    handleLocationUpdate(newLat, newLon, name);
  };

  const handleLocationUpdate = async (newLat: number, newLon: number, customName?: string) => {
    setLat(newLat);
    setLon(newLon);
    setSelectedCoords({ lat: newLat, lng: newLon });
    setManualLat(newLat.toFixed(4));
    setManualLon(newLon.toFixed(4));
    setLoading(true);
    setSearchResults([]);

    let finalName = customName || `Ubicación (${newLat.toFixed(3)}, ${newLon.toFixed(3)})`;
    if (!customName) {
      try { finalName = await reverseGeocode(newLat, newLon); } catch {}
    }
    setPlaceName(finalName);

    try {
      const data = await getWeatherData(
        newLat,
        newLon,
        2100,
        hasShade,
        scenario,
        livestockMode,
        dairyBreed,
        beefBreed,
        yieldLevel
      );
      setTemp(data.current.temperature);
      setRh(data.current.relativeHumidity);
      setWs(data.current.windSpeed);
      setSr(data.current.solarRadiation);
      setNightCoolingHours(data.nightCoolingHours);

      if (data.hourly?.time) {
        const hData = data.hourly.time.slice(0, 24).map((timeStr: string, i: number) => {
          const te = data.hourly.temperature_2m[i];
          const hu = data.hourly.relative_humidity_2m[i];
          const wi = data.hourly.wind_speed_10m[i];
          const so = data.hourly.direct_normal_irradiance ? data.hourly.direct_normal_irradiance[i] : 0;
          const bgt = estimateBGT(te, hu, wi, so, hasShade);
          const resH = livestockMode === 'dairy'
            ? calculateDHLI(bgt, hu, lang, dairyBreed, yieldLevel)
            : calculateHLI_Beef(bgt, hu, wi, lang, beefBreed);
          const hour = new Date(timeStr).getHours();
          return { label: `${hour}:00`, DHLI: resH.indexVal, Temp: te, BGT: bgt };
        });
        setHourlyData(hData);
      }

      if (data.daily?.time) {
        const diasSemana = lang === 'es' ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dData = data.daily.time.map((dateStr: string, i: number) => {
          const tMax = data.daily.temperature_2m_max[i];
          const hMean = data.daily.relative_humidity_2m_mean[i];
          const wMax = data.daily.wind_speed_10m_max[i];
          const sSum = (data.daily.shortwave_radiation_sum[i] * 1000000) / (24 * 3600);
          const bgt = estimateBGT(tMax, hMean, wMax, sSum, hasShade);
          const resD = livestockMode === 'dairy'
            ? calculateDHLI(bgt, hMean, lang, dairyBreed, yieldLevel)
            : calculateHLI_Beef(bgt, hMean, wMax, lang, beefBreed);
          const d = new Date(dateStr);
          return { label: `${diasSemana[d.getDay()]} ${d.getDate()}`, DHLI_Max: resD.indexVal, TempMax: tMax };
        });
        setDailyData(dData);
      }

      setYearsList(data.yearsData);
      const currentYearObj = data.yearsData.find((y: any) => y.year === filterYear) || data.yearsData[0];
      setSelectedYear(currentYearObj);
      if (currentYearObj?.months) {
        setSelectedMonth(currentYearObj.months[filterMonth]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCoords) {
      handleLocationUpdate(selectedCoords.lat, selectedCoords.lng, placeName);
    }
  }, [livestockMode, hasShade, dairyBreed, beefBreed, yieldLevel, scenario]);

  const handleManualCoordsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pLat = parseFloat(manualLat);
    const pLon = parseFloat(manualLon);
    if (!isNaN(pLat) && !isNaN(pLon)) {
      handleLocationUpdate(pLat, pLon);
      setShowCoordsPanel(false);
    }
  };

  const handleGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        handleLocationUpdate(pos.coords.latitude, pos.coords.longitude);
      });
    }
  };

  const handleSendWhatsAppAlert = () => {
    const dateStr = new Date().toLocaleDateString('es-CO');
    const indexName = livestockMode === 'dairy' ? 'DHLI' : 'HLI';
    const impactText = livestockMode === 'dairy'
      ? `Pérdida esperada: -${(result as any).milkLoss} litros/vaca/día (${dailyPhysicalLost.toFixed(0)} L/día en el hato)`
      : `Caída en ganancia: -${(result as any).adgLoss} kg/día/novillo`;

    const msg = `Alerta de estrés calórico bovino (${indexName})\n` +
      `Ubicación: ${placeName}\n` +
      `Propósito: ${livestockMode === 'dairy' ? `Leche (${dairyBreed})` : `Carne (${beefBreed})`}\n` +
      `Fecha: ${dateStr}\n` +
      `Índice actual: ${result.indexVal} (${result.category})\n` +
      `Temperatura: ${temp} °C | Humedad: ${rh}%\n` +
      `${impactText}\n` +
      `Pérdida financiera diaria: $${dailyMoneyLost.toLocaleString()} ${currencySymbol}\n` +
      `Diagnóstico: ${result.meaning}\n\n` +
      `Consulta el monitor en: https://dhli-global.org`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  const handleExportCSV = () => {
    if (hourlyData.length === 0) return;
    const indexName = livestockMode === 'dairy' ? 'DHLI' : 'HLI';
    let csvContent = `data:text/csv;charset=utf-8,Hora,Temperatura_C,BGT_C,${indexName}\n`;
    hourlyData.forEach((row) => {
      csvContent += `${row.label},${row.Temp},${row.BGT.toFixed(1)},${row.DHLI}\n`;
    });
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `${indexName}_Datos_${placeName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Gestión de Fotos y Noticias por el Administrador
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddNewsItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSummary.trim()) return;

    const newItem: NewsItem = {
      id: Date.now().toString(),
      title: newTitle,
      category: newCategory,
      summary: newSummary,
      imageUrl: newImagePreview || 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=800&q=80',
      date: 'Publicado hoy',
      linkText: 'Leer más',
    };

    const updated = [newItem, ...newsList];
    setNewsList(updated);
    try {
      localStorage.setItem('dhli_custom_news', JSON.stringify(updated));
    } catch {}

    setNewTitle('');
    setNewSummary('');
    setNewImagePreview('');
    setShowNewsAdminModal(false);
  };

  const handleDeleteNewsItem = (id: string) => {
    const updated = newsList.filter((item) => item.id !== id);
    setNewsList(updated);
    try {
      localStorage.setItem('dhli_custom_news', JSON.stringify(updated));
    } catch {}
  };

  // Carga persistente del Manual en PDF
  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target?.result as string;
        setManualPdfUrl(base64Data);
        try {
          localStorage.setItem('dhli_manual_pdf_data', base64Data);
        } catch {}
      };
      reader.readAsDataURL(file);
    }
  };

  const thresholdLineValue = livestockMode === 'dairy' ? 25 : 77;

  return (
    <main className={`min-h-screen font-sans transition-colors duration-500 ${livestockMode === 'dairy' ? 'bg-slate-900 text-slate-100' : 'bg-stone-950 text-stone-100'}`}>
      
      {/* Barra de Navegación Superior */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-40 px-4 md:px-10 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-3">
          
          <div className="flex items-center gap-3">
            <span className="text-3xl">{livestockMode === 'dairy' ? '🥛' : '🥩'}</span>
            <div>
              <span className="font-extrabold text-sm md:text-base tracking-wide text-emerald-400 block">
                Monitor global de estrés térmico bovino
              </span>
              <span className="text-[11px] text-slate-400">
                {livestockMode === 'dairy' ? 'Sistema lechero (DHLI - Lees et al., 2018)' : 'Sistema cárnico (HLI - Gaughan et al., 2008)'}
              </span>
            </div>
          </div>

          {/* Selector Leche vs Carne */}
          <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-white/10 shadow-2xl">
            <button
              onClick={() => { setLivestockMode('dairy'); setUnitPrice(2200); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${livestockMode === 'dairy' ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30' : 'text-slate-400 hover:text-white'}`}
            >
              <Milk className="w-4 h-4" /> Bovinos de leche (DHLI)
            </button>
            <button
              onClick={() => { setLivestockMode('beef'); setUnitPrice(8500); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${livestockMode === 'beef' ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:text-white'}`}
            >
              <Beef className="w-4 h-4" /> Bovinos de carne (HLI)
            </button>
          </div>

          {/* Acciones Rápidas */}
          <div className="flex items-center gap-2">
            <button onClick={() => setShowManualModal(true)} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" /> Manual de usuario
            </button>
            <button onClick={handleSendWhatsAppAlert} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-lg">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </button>
            <button onClick={() => setShowFinanceModal(!showFinanceModal)} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg">
              <DollarSign className="w-3.5 h-3.5" /> Calculadora ($)
            </button>
          </div>

        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">

        {/* Panel Central Interactivo / Carrusel de Novedades y Anuncios */}
        <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-blue-950/40 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {newsList[activeNewsIdx]?.category || 'Novedad'}
              </span>
              <span className="text-[11px] text-slate-400">{newsList[activeNewsIdx]?.date}</span>
            </div>

            {/* BOTÓN DIRECTO EN PANTALLA PARA GESTIONAR Y SUBIR ANUNCIOS */}
            <button
              onClick={() => setShowNewsAdminModal(true)}
              className="px-3 py-1 bg-white/10 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-semibold text-slate-300 border border-white/10 flex items-center gap-1.5 transition"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" /> Gestionar anuncios
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 space-y-3">
              <h2 className="text-xl md:text-2xl font-bold text-white leading-tight">
                {newsList[activeNewsIdx]?.title}
              </h2>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                {newsList[activeNewsIdx]?.summary}
              </p>
              <div className="flex gap-2 pt-2">
                {newsList.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveNewsIdx(i)}
                    className={`h-2 rounded-full transition-all ${activeNewsIdx === i ? 'w-8 bg-emerald-400' : 'w-2 bg-white/20'}`}
                  />
                ))}
              </div>
            </div>

            <div className="relative h-44 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
              <img
                src={newsList[activeNewsIdx]?.imageUrl}
                alt="Imagen del anuncio"
                className="w-full h-full object-cover transform hover:scale-105 transition duration-500"
              />
            </div>
          </div>
        </div>

        {/* Barra de Búsqueda y Filtros con Botón de Buscar */}
        <div className="bg-slate-900/90 p-4 rounded-3xl border border-white/10 shadow-2xl space-y-4 backdrop-blur-xl">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex-1 min-w-[280px] flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Buscar municipio, departamento o país (ej. Sopó, Montería, Rafaela)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-2xl text-xs md:text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              </div>
              <button
                onClick={() => {
                  if (searchResults.length > 0) handleSelectPlace(searchResults[0]);
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs transition flex items-center gap-1.5 shadow-lg"
              >
                Buscar
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={handleGPS} className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-600 rounded-2xl text-xs font-semibold flex items-center gap-1.5 text-white transition">
                <MapPin className="w-4 h-4" /> Mi ubicación (GPS)
              </button>
              <button onClick={() => setShowCoordsPanel(!showCoordsPanel)} className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-2xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 text-white transition">
                <Navigation className="w-4 h-4" /> Coordenadas
              </button>
              <button
                onClick={() => setHasShade(!hasShade)}
                className={`px-3.5 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 border transition ${hasShade ? 'bg-teal-600 border-teal-400 text-white' : 'bg-amber-600 border-amber-500 text-white'}`}
              >
                {hasShade ? <Trees className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                {hasShade ? 'Con sombra (80% atenuación)' : 'A pleno sol'}
              </button>
              <button
                onClick={() => setMapMode(mapMode === 'globe' ? 'satellite' : 'globe')}
                className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-xs font-semibold flex items-center gap-1.5 text-white transition"
              >
                {mapMode === 'globe' ? <MapIcon className="w-4 h-4" /> : <Globe2 className="w-4 h-4" />}
                {mapMode === 'globe' ? 'Ver finca (Satélite 2D)' : 'Ver globo 3D'}
              </button>
            </div>
          </div>

          {/* Autocompletado */}
          {searchResults.length > 0 && (
            <div className="bg-slate-950 border border-slate-700 rounded-2xl overflow-hidden divide-y divide-slate-800">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPlace(item)}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-900 text-xs text-slate-300 flex items-center gap-2 transition"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Coordenadas Manuales */}
          {showCoordsPanel && (
            <form onSubmit={handleManualCoordsSubmit} className="pt-2 border-t border-slate-800 flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[140px]">
                <label className="text-[11px] text-slate-400 block mb-1">Latitud (-90 a 90):</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Ej. 6.15"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="text-[11px] text-slate-400 block mb-1">Longitud (-180 a 180):</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Ej. -75.36"
                  value={manualLon}
                  onChange={(e) => setManualLon(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>
              <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white">
                Ir a coordenadas
              </button>
            </form>
          )}

          {/* Configuración del Hato Visible y Separada */}
          <div className="pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                {livestockMode === 'dairy' ? '🥛 Hato lechero (Raza / Biotipo):' : '🥩 Hato cárnico (Raza / Biotipo):'}
              </label>
              {livestockMode === 'dairy' ? (
                <select
                  value={dairyBreed}
                  onChange={(e) => setDairyBreed(e.target.value as DairyBreedType)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="holstein">Holstein / Frisón (Umbral crítico temprano)</option>
                  <option value="jersey">Jersey (Tolerancia intermedia - DairyNZ)</option>
                  <option value="girolando">Girolando 1/2 y 3/4 (Alta tolerancia tropical)</option>
                  <option value="cross">Doble propósito / Criollo (Rusticidad adaptada)</option>
                </select>
              ) : (
                <select
                  value={beefBreed}
                  onChange={(e) => setBeefBreed(e.target.value as BeefBreedType)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="angus">Británicas / Continentales (Angus, Hereford)</option>
                  <option value="brangus">Sintéticas (Brangus, Braford)</option>
                  <option value="brahman">Cebuinas / Zebu (Brahman, Nelore)</option>
                </select>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                {livestockMode === 'dairy' ? 'Nivel de producción diaria:' : 'Sistema de engorde:'}
              </label>
              {livestockMode === 'dairy' ? (
                <select
                  value={yieldLevel}
                  onChange={(e) => setYieldLevel(e.target.value as YieldLevel)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="high">Alta producción (&gt; 35 L / vaca / día)</option>
                  <option value="medium">Producción media (20 – 30 L / vaca / día)</option>
                  <option value="low">Baja producción / Pastoreo (&lt; 15 L / vaca / día)</option>
                </select>
              ) : (
                <select className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500">
                  <option>Ceba en pastoreo intensivo</option>
                  <option>Engorde a corral / Confinamiento (Feedlot)</option>
                  <option>Levante y recría</option>
                </select>
              )}
            </div>
          </div>

        </div>

        {/* Visor de Mapa con Avatar Bovino Futurista */}
        <div className="relative">
          {mapMode === 'globe' ? (
            <EarthGlobe
              lang={lang}
              selectedCoords={selectedCoords}
              onSelectLocation={(newLat, newLon) => handleLocationUpdate(newLat, newLon)}
            />
          ) : (
            <FarmMap
              lat={lat}
              lon={lon}
              heatLevel={result.indexVal}
              onLocationChange={(newLat, newLon) => handleLocationUpdate(newLat, newLon)}
            />
          )}

          {/* Avatar Bovino Futurista */}
          <div className="absolute top-4 right-4 z-20 group cursor-pointer">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/20 p-2 shadow-2xl transform group-hover:scale-110 group-hover:rotate-3 transition duration-300 flex flex-col items-center justify-center">
              <span className="text-2xl md:text-3xl animate-bounce">
                {livestockMode === 'dairy' ? '🧬🐄' : '⚡🐂'}
              </span>
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter">
                {livestockMode === 'dairy' ? 'Genoma lechero' : 'Biotipo carne'}
              </span>
            </div>
          </div>
        </div>

        {/* Tarjetas de Diagnóstico y Pérdidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-slate-900/90 p-6 rounded-3xl border border-white/10 space-y-3 shadow-xl backdrop-blur-xl">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {livestockMode === 'dairy' ? 'Índice DHLI actual' : 'Índice HLI actual'}
              </span>
              {hasShade && (
                <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-800 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                  <Trees className="w-3 h-3" /> Sombra activa
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-black" style={{ color: result.color }}>
                {selectedCoords ? result.indexVal : '--'}
              </span>
              <span className="text-xs text-slate-400">{livestockMode === 'dairy' ? '/ 100' : 'HLI'}</span>
            </div>
            <div className="inline-block px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: `${result.color}20`, color: result.color }}>
              {selectedCoords ? result.category : 'Listo para analizar'}
            </div>
            <p className="text-xs text-slate-300 border-t border-slate-800 pt-3">
              {selectedCoords ? result.meaning : 'Haz clic en el mapa o busca un municipio para calcular.'}
            </p>
          </div>

          <div className="bg-slate-900/90 p-6 rounded-3xl border border-white/10 space-y-3 shadow-xl backdrop-blur-xl">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clima en el predio</span>
            <p className="text-xs text-emerald-400 truncate font-semibold">{loading ? 'Consultando satélite...' : placeName}</p>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>Temperatura: <strong>{selectedCoords ? `${temp} °C` : '--'}</strong></div>
              <div>Humedad: <strong>{selectedCoords ? `${rh}%` : '--'}</strong></div>
              <div>Viento: <strong>{selectedCoords ? `${ws} m/s` : '--'}</strong></div>
              <div>Radiación: <strong>{selectedCoords ? (hasShade ? `${(sr * 0.2).toFixed(0)} W/m²` : `${sr} W/m²`) : '--'}</strong></div>
            </div>
            <div className="pt-2 border-t border-slate-800 text-xs text-slate-400">
              Globo negro (BGT): <strong className="text-white">{selectedCoords ? `${result.bgt} °C` : '--'}</strong>
            </div>
          </div>

          <div className="bg-slate-900/90 p-6 rounded-3xl border border-white/10 space-y-3 shadow-xl backdrop-blur-xl">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Impacto productivo</span>
              {selectedCoords && dailyMoneyLost > 0 && (
                <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded-full font-mono">
                  -${dailyMoneyLost.toLocaleString()} {currencySymbol}/día
                </span>
              )}
            </div>

            {livestockMode === 'dairy' ? (
              <div className="text-3xl font-black text-amber-400 pt-1">
                {selectedCoords ? ((result as any).milkLoss === 0 ? '0.0 L' : `-${(result as any).milkLoss} L`) : '--'}
                <span className="text-xs text-slate-400 font-normal"> / vaca / día</span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-3xl font-black text-amber-400 pt-1">
                  {selectedCoords ? ((result as any).adgLoss === 0 ? '0.00 kg' : `-${(result as any).adgLoss} kg`) : '--'}
                  <span className="text-xs text-slate-400 font-normal"> / animal / día</span>
                </div>
                {selectedCoords && (result as any).dmiDrop > 0 && (
                  <div className="text-[11px] text-red-300 font-semibold">
                    Caída en consumo de alimento: -{(result as any).dmiDrop}% | Retraso faena: +{(result as any).extraDays} días
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex items-center gap-2 text-xs">
              <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="text-slate-300">
                <span className="font-semibold">Recuperación nocturna:</span>{' '}
                <span className={nightCoolingHours >= 6 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {nightCoolingHours}h ({nightCoolingHours >= 6 ? 'Óptima' : 'Alerta'})
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Panel Predictivo con Filtro en 4 Clics y Línea de Umbral Discontinua */}
        <div className="bg-slate-900/90 p-6 rounded-3xl border border-white/10 space-y-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-base text-white">Módulo predictivo y análisis multiescala</h3>
              <p className="text-xs text-slate-400">Selecciona el horizonte temporal en 4 clics directos</p>
            </div>

            {/* 4 CLICS CENTRALIZADOS: Año -> Mes -> Día -> Hora */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-semibold">Año:</span>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(Number(e.target.value))}
                  className="bg-slate-900 text-white rounded-lg px-2 py-1 border border-slate-700"
                >
                  {[2024, 2025, 2026, 2030, 2040, 2050].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-semibold">Mes:</span>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(Number(e.target.value))}
                  className="bg-slate-900 text-white rounded-lg px-2 py-1 border border-slate-700"
                >
                  {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((m, i) => (
                    <option key={m} value={i}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-semibold">Día:</span>
                <select
                  value={filterDay}
                  onChange={(e) => setFilterDay(Number(e.target.value))}
                  className="bg-slate-900 text-white rounded-lg px-2 py-1 border border-slate-700"
                >
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>Día {d}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-semibold">Hora:</span>
                <select
                  value={filterHour}
                  onChange={(e) => setFilterHour(Number(e.target.value))}
                  className="bg-slate-900 text-white rounded-lg px-2 py-1 border border-slate-700"
                >
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                    <option key={h} value={h}>{h}:00</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Gráfica con Línea Roja Discontinua de Umbral */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Variación horaria del índice (próximas 24 horas):</span>
              <span className="text-red-400 font-bold flex items-center gap-1">
                --- Umbral crítico ({thresholdLineValue} {livestockMode === 'dairy' ? 'DHLI' : 'HLI'})
              </span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="dhliGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={livestockMode === 'dairy' ? '#10B981' : '#EF4444'} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={livestockMode === 'dairy' ? '#10B981' : '#EF4444'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} />
                  <YAxis domain={[0, livestockMode === 'dairy' ? 100 : 120]} stroke="#94A3B8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                  <ReferenceLine y={thresholdLineValue} stroke="#EF4444" strokeDasharray="6 6" strokeWidth={2} />
                  <Area type="monotone" dataKey="DHLI" stroke={livestockMode === 'dairy' ? '#10B981' : '#EF4444'} fillOpacity={1} fill="url(#dhliGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL DE ADMINISTRACIÓN DE ANUNCIOS Y FOTOS EN VIVO */}
      {showNewsAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" /> Administración de anuncios y noticias en vivo
              </h3>
              <button onClick={() => setShowNewsAdminModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {/* Formulario de publicación */}
            <form onSubmit={handleAddNewsItem} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Título de la noticia o anuncio:</label>
                <input
                  type="text"
                  placeholder="Ej. Resultados de siembra de sombra en La Ceja"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Categoría:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Noticia">Noticia</option>
                    <option value="Investigación">Investigación</option>
                    <option value="Evento ganadero">Evento ganadero</option>
                    <option value="Publicidad">Publicidad / Producto</option>
                    <option value="Manejo en potrero">Manejo en potrero</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Foto (desde tu computador o celular):</label>
                  <input
                    type="file"
                    accept="image/*"
                    ref={newsImageInputRef}
                    onChange={handleImageFileChange}
                    className="w-full text-slate-400 text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-emerald-600 file:text-white file:cursor-pointer"
                  />
                </div>
              </div>

              {newImagePreview && (
                <div className="h-28 w-full rounded-xl overflow-hidden border border-emerald-500/40 relative">
                  <img src={newImagePreview} alt="Previsualización" className="w-full h-full object-cover" />
                </div>
              )}

              <div>
                <label className="text-slate-400 block mb-1">Resumen o descripción:</label>
                <textarea
                  rows={3}
                  placeholder="Escribe el texto descriptivo del anuncio..."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-lg"
              >
                Publicar en el carrusel
              </button>
            </form>

            {/* Lista de anuncios publicados con opción de eliminar */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300 block">Anuncios activos actualmente ({newsList.length}):</span>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {newsList.map((item) => (
                  <div key={item.id} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold text-white text-xs truncate">{item.title}</div>
                        <div className="text-[10px] text-emerald-400">{item.category}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteNewsItem(item.id)}
                      className="p-1.5 bg-red-950 hover:bg-red-800 text-red-300 rounded-lg shrink-0 transition"
                      title="Eliminar anuncio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal del Manual con Carga de PDF en Vivo */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-400" /> Manual de usuario e interpretación
              </h3>
              <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p><strong>1. Búsqueda y localización:</strong> Puedes localizar tu predio escribiendo el nombre del municipio, activando el sensor GPS del dispositivo o introduciendo coordenadas geográficas.</p>
              <p><strong>2. Interpretación de índices:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Leche (DHLI):</strong> Valores inferiores a 25 indican confort térmico. Valores superiores a 25 implican el inicio de jadeo respiratorio y merma progresiva en la síntesis de leche.</li>
                <li><strong>Carne (HLI):</strong> Valores inferiores a 70 representan termoneutralidad. Por encima del umbral racial (86 a 93) disminuye la ganancia de peso y el consumo de materia seca.</li>
              </ul>
              <p><strong>3. Mitigación por sombra:</strong> Al activar el botón de sombra se simula una reducción del 80% en la radiación solar incidente, mostrando la disminución en temperatura de globo negro y el ahorro productivo.</p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex flex-wrap justify-between items-center gap-3">
              <label className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition">
                <Upload className="w-4 h-4 text-emerald-400" /> Subir archivo PDF del manual
                <input type="file" accept="application/pdf" className="hidden" onChange={handleManualUpload} />
              </label>

              {manualPdfUrl ? (
                <a
                  href={manualPdfUrl}
                  download="Manual_Usuario_DHLI.pdf"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-lg"
                >
                  <Download className="w-4 h-4" /> Descargar manual en PDF
                </a>
              ) : (
                <span className="text-[11px] text-slate-500">PDF listo para cargar</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de la Calculadora Financiera */}
      {showFinanceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-400" /> Calculadora de pérdidas y retorno de inversión (ROI)
              </h3>
              <button onClick={() => setShowFinanceModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Animales en lote:</label>
                <input type="number" min="1" value={animalCount} onChange={(e) => setAnimalCount(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Precio unitario:</label>
                <input type="number" min="0" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Moneda:</label>
                <select value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white">
                  <option value="COP ($)">COP ($)</option>
                  <option value="USD ($)">USD ($)</option>
                  <option value="BRL (R$)">BRL (R$)</option>
                  <option value="EUR (€)">EUR (€)</option>
                  <option value="MXN ($)">MXN ($)</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Costo de inversión:</label>
                <input type="number" min="0" value={mitigationCost} onChange={(e) => setMitigationCost(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Pérdida diaria:</span>
                <span className="text-xl font-bold text-amber-400">${dailyMoneyLost.toLocaleString()}</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Pérdida mensual:</span>
                <span className="text-xl font-bold text-red-400">${monthlyMoneyLost.toLocaleString()}</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Retorno (ROI):</span>
                <span className="text-xl font-bold text-emerald-400">{roiMonths} meses</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pie de Página Oficial con Autores y Enlaces ORCID */}
      <footer className="border-t border-white/10 mt-12 pt-8 pb-12 bg-black/60 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="space-y-1">
              <span className="text-sm font-bold text-slate-200 block">Plataforma de predicción de estrés calórico bovino</span>
              <span className="text-[11px] text-slate-500">Desarrollada para investigación zootécnica y toma de decisiones en campo</span>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={handleExportCSV} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold flex items-center gap-1.5 transition">
                <Download className="w-3.5 h-3.5 text-emerald-400" /> Descargar datos (CSV)
              </button>
              <button onClick={() => window.print()} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold flex items-center gap-1.5 transition">
                <Printer className="w-3.5 h-3.5 text-blue-400" /> Imprimir reporte (PDF)
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 space-y-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">Autores e investigación:</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <a
                href="https://orcid.org/0000-0001-7064-6753"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-slate-900/60 hover:bg-slate-800 rounded-2xl border border-white/5 transition flex items-center gap-2 group"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 group-hover:animate-ping" />
                <div>
                  <div className="font-semibold text-slate-200">William Armando Tapie Canacuan</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">ORCID: 0000-0001-7064-6753 <ExternalLink className="w-2.5 h-2.5" /></div>
                </div>
              </a>

              <a
                href="https://orcid.org/0001-6651-3819"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-slate-900/60 hover:bg-slate-800 rounded-2xl border border-white/5 transition flex items-center gap-2 group"
              >
                <span className="w-2 h-2 rounded-full bg-blue-400 group-hover:animate-ping" />
                <div>
                  <div className="font-semibold text-slate-200">Carlos Eduardo Giraldo Sanchez</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">ORCID: 0001-6651-3819 <ExternalLink className="w-2.5 h-2.5" /></div>
                </div>
              </a>

              <a
                href="https://orcid.org/0009-0002-0122-8667"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-slate-900/60 hover:bg-slate-800 rounded-2xl border border-white/5 transition flex items-center gap-2 group"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 group-hover:animate-ping" />
                <div>
                  <div className="font-semibold text-slate-200">Juan Fernando Manrique Hincapie</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">ORCID: 0009-0002-0122-8667 <ExternalLink className="w-2.5 h-2.5" /></div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Asistente Zootécnico IA */}
      <AiChatbot
        context={{
          placeName,
          livestockMode,
          indexVal: result.indexVal,
          category: result.category,
          temp,
          rh,
          ws,
          sr,
          bgt: result.bgt,
          hasShade,
          dairyBreed,
          beefBreed,
          yieldLevel,
          loss: livestockMode === 'dairy' ? (result as any).milkLoss : (result as any).adgLoss,
          nightCoolingHours,
          lang,
        }}
      />
    </main>
  );
}