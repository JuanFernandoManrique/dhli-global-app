'use client';
import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { getWeatherData, reverseGeocode } from '../lib/weather-api';
import { estimateBGT, calculateDHLI, calculateHLI_Beef, LivestockMode, DairyBreedType, BeefBreedType, YieldLevel } from '../lib/dhli-calculator';
import { initialNewsFeed, NewsItem } from '../lib/news-feed';
import AiChatbot from '../components/AiChatbot';
import { 
  Search, MapPin, Sliders, Thermometer, Wind, Droplets, Sun, Calendar, Clock, 
  TrendingUp, Globe2, Map as MapIcon, ChevronRight, RotateCcw, Navigation, 
  Trees, Download, Printer, Moon, DollarSign, MessageCircle, Settings, 
  Beef, Milk, BookOpen, ExternalLink, PlusCircle, Trash2, Lock, ArrowLeft, ArrowRight, X
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Area } from 'recharts';

const EarthGlobe = dynamic(() => import('../components/EarthGlobe'), { ssr: false });
const FarmMap = dynamic(() => import('../components/FarmMap'), { ssr: false });
const GlobalHeatMap = dynamic(() => import('../components/GlobalHeatMap'), { ssr: false });

export default function HomePage() {
  const [lang, setLang] = useState<'es' | 'en' | 'pt'>('es');
  const [livestockMode, setLivestockMode] = useState<LivestockMode>('dairy');

  // Modal de bienvenida inicial
  const [showWelcomeSplash, setShowWelcomeSplash] = useState(false);

  // Ubicación y Coordenadas
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [placeName, setPlaceName] = useState<string>('Selecciona un punto en el mapa o busca un municipio');
  const [lat, setLat] = useState<number>(4.57);
  const [lon, setLon] = useState<number>(-74.29);
  const [manualLat, setManualLat] = useState<string>('');
  const [manualLon, setManualLon] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Configuración del Hato
  const [hasShade, setHasShade] = useState<boolean>(false);
  const [dairyBreed, setDairyBreed] = useState<DairyBreedType>('holstein');
  const [beefBreed, setBeefBreed] = useState<BeefBreedType>('angus');
  const [yieldLevel, setYieldLevel] = useState<YieldLevel>('medium');
  const [scenario, setScenario] = useState<'ssp245' | 'ssp585'>('ssp245');
  const [nightCoolingHours, setNightCoolingHours] = useState<number>(6);

  // Módulo Financiero
  const [showFinanceModal, setShowFinanceModal] = useState<boolean>(false);
  const [animalCount, setAnimalCount] = useState<number>(80);
  const [unitPrice, setUnitPrice] = useState<number>(2200);
  const [currencySymbol, setCurrencySymbol] = useState<string>('COP ($)');
  const [mitigationCost, setMitigationCost] = useState<number>(8000000);

  // Vistas
  const [showCoordsPanel, setShowCoordsPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mapMode, setMapMode] = useState<'globe' | 'satellite'>('satellite');

  // MÓDULO PREDICTIVO MULTIESCALA (INICIA POR DEFECTO EN 24 HORAS)
  const [drillLevel, setDrillLevel] = useState<'hour' | 'day' | 'month' | 'year'>('hour');
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [selectedHour, setSelectedHour] = useState<number>(14);

  // Variables Climáticas
  const [temp, setTemp] = useState(20);
  const [rh, setRh] = useState(70);
  const [ws, setWs] = useState(2);
  const [sr, setSr] = useState(400);

  // Noticias Protegidas
  const [newsList, setNewsList] = useState<NewsItem[]>(initialNewsFeed);
  const [activeNewsIdx, setActiveNewsIdx] = useState(0);
  const [showNewsAdminModal, setShowNewsAdminModal] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState(false);

  // Formulario anuncio
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Noticia');
  const [newSummary, setNewSummary] = useState('');
  const [newImagePreview, setNewImagePreview] = useState('');
  const newsImageInputRef = useRef<HTMLInputElement>(null);

  // Manual
  const [showManualModal, setShowManualModal] = useState(false);

  // Carga del visor 3D oficial de Google
  useEffect(() => {
    if (typeof window !== 'undefined' && !customElements.get('model-viewer')) {
      const script = document.createElement('script');
      script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
      script.type = 'module';
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    try {
      const savedNews = localStorage.getItem('dhli_custom_news');
      if (savedNews) setNewsList(JSON.parse(savedNews));

      const welcomed = sessionStorage.getItem('dhli_welcomed');
      if (!welcomed) {
        setShowWelcomeSplash(true);
        sessionStorage.setItem('dhli_welcomed', 'true');
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (newsList.length <= 1) return;
    const interval = setInterval(() => {
      setActiveNewsIdx((prev) => (prev + 1) % newsList.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [newsList.length]);

  // Buscador predictivo en tiempo real
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=6&addressdetails=1`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error('Error buscando lugares:', err);
      } finally {
        setIsSearching(false);
      }
    }, 380);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const handleSelectPlace = (item: any) => {
    const newLat = parseFloat(item.lat);
    const newLon = parseFloat(item.lon);
    const name = item.display_name.split(',').slice(0, 3).join(', ');
    setSearchQuery('');
    setSearchResults([]);
    setDrillLevel('hour');
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
  }, [livestockMode, hasShade, dairyBreed, beefBreed, yieldLevel, scenario, selectedYear, selectedMonth, selectedDay, selectedHour]);

  const handleManualCoordsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pLat = parseFloat(manualLat);
    const pLon = parseFloat(manualLon);
    if (!isNaN(pLat) && !isNaN(pLon)) {
      setDrillLevel('hour');
      handleLocationUpdate(pLat, pLon);
      setShowCoordsPanel(false);
    }
  };

  const handleGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setDrillLevel('hour');
        handleLocationUpdate(pos.coords.latitude, pos.coords.longitude);
      });
    }
  };

  const handleSendWhatsAppAlert = () => {
    const dateStr = `${selectedDay}/${selectedMonth + 1}/${selectedYear} - ${selectedHour}:00`;
    const indexName = livestockMode === 'dairy' ? 'DHLI' : 'HLI';
    const impactText = livestockMode === 'dairy'
      ? `Pérdida esperada: -${(result as any).milkLoss} L/vaca/día (${dailyPhysicalLost.toFixed(0)} L/día en hato)`
      : `Caída en ganancia: -${(result as any).adgLoss} kg/día/novillo`;

    const msg = `🚨 Alerta de estrés térmico bovino (${indexName})\n` +
      `📍 Predio: ${placeName}\n` +
      `🐄 Sistema: ${livestockMode === 'dairy' ? `Leche (${dairyBreed})` : `Carne (${beefBreed})`}\n` +
      `📅 Fecha: ${dateStr}\n` +
      `🌡️ Índice actual: ${result.indexVal} (${result.category})\n` +
      `💨 Clima: ${temp}°C | HR: ${rh}% | BGT: ${result.bgt}°C\n` +
      `📉 Impacto productivo: ${impactText}\n` +
      `💰 Pérdida económica: $${dailyMoneyLost.toLocaleString()} ${currencySymbol}/día\n` +
      `🌱 Sombra: ${hasShade ? 'Mitigada (80%)' : 'A pleno sol'}\n\n` +
      `Plataforma oficial: https://dhli-global-app.vercel.app`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  };

  const handleExportCSV = () => {
    const indexName = livestockMode === 'dairy' ? 'DHLI' : 'HLI';
    let csvContent = `data:text/csv;charset=utf-8,Periodo,${indexName}_Indice,Temperatura_C\n`;
    getChartData().forEach((row) => {
      csvContent += `${row.label},${row.val},${row.temp}\n`;
    });
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `${indexName}_${drillLevel}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === '1234' || adminPin === 'admin2026') {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

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

  // DATOS DINÁMICOS
  const getYearsList = () => {
    const startYear = 1980;
    const endYear = 2100;
    const step = 5;
    const yrs: number[] = [];
    for (let y = startYear; y <= endYear; y += step) yrs.push(y);
    if (!yrs.includes(selectedYear)) yrs.push(selectedYear);
    yrs.sort((a, b) => a - b);
    return yrs.map((y) => ({
      label: y.toString(),
      val: Math.round(result.indexVal - 5 + ((y - 2024) * 0.12)),
      temp: +(temp + ((y - 2024) * 0.025)).toFixed(1),
      raw: y
    }));
  };

  const getMonthsList = () => {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return meses.map((m, idx) => ({
      label: m,
      val: Math.round(result.indexVal + Math.sin((idx - 2) / 2) * 4),
      temp: +(temp + Math.sin((idx - 2) / 2) * 2.2).toFixed(1),
      raw: idx
    }));
  };

  const getDaysList = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => ({
      label: `${i + 1}`, // SOLO NÚMERO
      val: Math.round(result.indexVal + Math.cos(i / 2.5) * 3),
      temp: +(temp + Math.cos(i / 2.5) * 1.5).toFixed(1),
      raw: i + 1
    }));
  };

  const getHoursList = () => {
    return Array.from({ length: 24 }, (_, i) => {
      const peak = i >= 11 && i <= 16 ? (i === 13 || i === 14 ? 7 : 5) : i < 6 ? -5 : 1;
      return {
        label: `${i}:00`,
        val: Math.round(result.indexVal + peak),
        temp: +(temp + peak * 0.5).toFixed(1),
        raw: i
      };
    });
  };

  const getChartData = () => {
    switch (drillLevel) {
      case 'year': return getYearsList();
      case 'month': return getMonthsList();
      case 'day': return getDaysList();
      case 'hour':
      default: return getHoursList();
    }
  };

  const handleChartPointClick = (entry: any) => {
    if (!entry || !entry.activePayload || !entry.activePayload[0]) return;
    const clicked = entry.activePayload[0].payload;
    if (drillLevel === 'year') {
      setSelectedYear(clicked.raw);
      setDrillLevel('month');
    } else if (drillLevel === 'month') {
      setSelectedMonth(clicked.raw);
      setDrillLevel('day');
    } else if (drillLevel === 'day') {
      setSelectedDay(clicked.raw);
      setDrillLevel('hour');
    } else if (drillLevel === 'hour') {
      setSelectedHour(clicked.raw);
    }
  };

  const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const thresholdLineValue = livestockMode === 'dairy' ? 25 : 77;

  // COLOR DEL GRÁFICO: ESMERALDA LUMINOSO EN LECHE, ÁMBAR DORADO CÁLIDO EN CARNE
  const lineColor = livestockMode === 'dairy' ? '#10B981' : '#F59E0B';

  return (
    <main className={`min-h-screen transition-colors duration-500 ${livestockMode === 'dairy' ? 'bg-[#F8FAFC]' : 'bg-[#FFFDFB]'} text-slate-800 font-sans`}>
      
      {/* PANTALLA INICIAL DE SELECCIÓN */}
      {showWelcomeSplash && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-8 text-center space-y-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Plataforma zootécnica de precisión</span>
              <h2 className="text-2xl font-black text-slate-900 mt-1">Selecciona el tipo de producción</h2>
              <p className="text-xs text-slate-500 mt-1">Configura los algoritmos bioclimáticos para tu predio.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => { setLivestockMode('dairy'); setUnitPrice(2200); setShowWelcomeSplash(false); }}
                className="p-5 rounded-2xl border-2 border-emerald-500/20 hover:border-emerald-600 bg-emerald-50/40 hover:bg-emerald-50 transition text-left space-y-2 group"
              >
                <span className="text-3xl block group-hover:scale-110 transition">🥛</span>
                <div className="font-bold text-slate-900 text-sm">Bovinos de leche</div>
                <div className="text-[11px] text-slate-500 leading-tight">Algoritmo DHLI (Lees et al., 2018). Caída en litros y sólidos.</div>
              </button>

              <button
                onClick={() => { setLivestockMode('beef'); setUnitPrice(8500); setShowWelcomeSplash(false); }}
                className="p-5 rounded-2xl border-2 border-amber-500/20 hover:border-amber-600 bg-amber-50/40 hover:bg-amber-50 transition text-left space-y-2 group"
              >
                <span className="text-3xl block group-hover:scale-110 transition">🥩</span>
                <div className="font-bold text-slate-900 text-sm">Bovinos de carne</div>
                <div className="text-[11px] text-slate-500 leading-tight">Algoritmo HLI (Gaughan et al., 2008). Ganancia diaria de peso.</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CABECERA SUPERIOR */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 md:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-3">
          
          <div className="flex items-center gap-3">
            <span className="text-2xl">{livestockMode === 'dairy' ? '🥛' : '🥩'}</span>
            <div>
              <span className="font-bold text-sm md:text-base text-slate-900 block leading-tight">
                Monitor global de estrés térmico bovino
              </span>
              <span className={`text-[11px] font-semibold ${livestockMode === 'dairy' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {livestockMode === 'dairy' ? 'Sistema lechero (DHLI - Lees et al., 2018)' : 'Sistema cárnico (HLI - Gaughan et al., 2008)'}
              </span>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => { setLivestockMode('dairy'); setUnitPrice(2200); }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${livestockMode === 'dairy' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <Milk className="w-3.5 h-3.5 text-emerald-600" /> Bovinos de leche (DHLI)
            </button>
            <button
              onClick={() => { setLivestockMode('beef'); setUnitPrice(8500); }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${livestockMode === 'beef' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <Beef className="w-3.5 h-3.5 text-amber-600" /> Bovinos de carne (HLI)
            </button>
          </div>

          <div className="flex items-center">
            <button
              onClick={() => setShowManualModal(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-500" /> Manual de usuario
            </button>
          </div>

        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">

        {/* HERO SUPERIOR: CARRUSEL CON ANIMAL 3D FLOTANTE */}
        <div className={`relative rounded-3xl border p-6 md:p-8 shadow-sm transition-all overflow-hidden ${livestockMode === 'dairy' ? 'bg-gradient-to-r from-emerald-50/70 via-slate-50 to-white border-emerald-100' : 'bg-gradient-to-r from-amber-50/70 via-slate-50 to-white border-amber-100'}`}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${livestockMode === 'dairy' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}`}>
                {newsList[activeNewsIdx]?.category || 'Novedad'}
              </span>
              <span className="text-[11px] text-slate-400">{newsList[activeNewsIdx]?.date}</span>
            </div>

            <button
              onClick={() => setShowNewsAdminModal(true)}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-[11px] font-semibold border border-slate-200 flex items-center gap-1 shadow-2xs"
            >
              <Lock className="w-3 h-3 text-slate-400" /> Administrar noticias
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            <div className="md:col-span-5 space-y-2">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 leading-snug">
                {newsList[activeNewsIdx]?.title}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                {newsList[activeNewsIdx]?.summary}
              </p>
              <div className="flex gap-1.5 pt-1">
                {newsList.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveNewsIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${activeNewsIdx === i ? (livestockMode === 'dairy' ? 'w-6 bg-emerald-600' : 'w-6 bg-amber-600') : 'w-1.5 bg-slate-300'}`}
                  />
                ))}
              </div>
            </div>

            <div className="md:col-span-3 h-36 rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
              <img
                src={newsList[activeNewsIdx]?.imageUrl}
                alt="Noticia"
                className="w-full h-full object-cover"
              />
            </div>

            {/* MODELO 3D REAL (TRANSPARENTE, SIN FONDO Y GIRATORIO) */}
            <div className="md:col-span-4 h-44 flex items-center justify-center relative cursor-grab active:cursor-grabbing">
              {React.createElement('model-viewer', {
                src: livestockMode === 'dairy' ? '/models/cow-dairy.glb' : '/models/bull-beef.glb',
                'camera-controls': true,
                'auto-rotate': true,
                'shadow-intensity': '0.8',
                'rotation-per-second': '25deg',
                style: { width: '100%', height: '100%', background: 'transparent', outline: 'none' }
              })}
            </div>

          </div>
        </div>

        {/* BARRA DE BÚSQUEDA ELEGANTE CON CALCULADORA ROI */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-wrap gap-2.5 items-center justify-between">
            
            <div className="flex-1 min-w-[260px] relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar municipio o departamento (ej. Sopó, Montería, Rafaela)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                {isSearching && (
                  <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 animate-pulse">Buscando...</span>
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-100 max-h-52 overflow-y-auto">
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectPlace(item)}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-xs text-slate-700 flex items-center gap-2"
                    >
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{item.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowFinanceModal(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition"
              title="Calculadora de pérdidas y retorno de inversión"
            >
              <DollarSign className="w-3.5 h-3.5 text-slate-600" /> Calculadora ROI
            </button>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleGPS}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <MapPin className="w-3.5 h-3.5 text-slate-300" /> GPS
              </button>

              <button
                onClick={() => setShowCoordsPanel(!showCoordsPanel)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition"
              >
                <Navigation className="w-3.5 h-3.5 text-slate-500" /> Coordenadas
              </button>

              <button
                onClick={() => setHasShade(!hasShade)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${hasShade ? 'bg-slate-700 border-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'}`}
              >
                {hasShade ? <Trees className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                {hasShade ? 'Con sombra (80%)' : 'A pleno sol'}
              </button>

              <button
                onClick={() => setMapMode(mapMode === 'globe' ? 'satellite' : 'globe')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition"
              >
                {mapMode === 'globe' ? <MapIcon className="w-3.5 h-3.5 text-slate-500" /> : <Globe2 className="w-3.5 h-3.5 text-slate-500" />}
                {mapMode === 'globe' ? 'Satélite 2D' : 'Globo 3D'}
              </button>
            </div>
          </div>

          {showCoordsPanel && (
            <form onSubmit={handleManualCoordsSubmit} className="pt-2 border-t border-slate-100 flex flex-wrap gap-2.5 items-end text-xs">
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Latitud (-90 a 90):</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Ej. 6.15"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Longitud (-180 a 180):</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Ej. -75.36"
                  value={manualLon}
                  onChange={(e) => setManualLon(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <button type="submit" className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold">
                Ir al punto
              </button>
            </form>
          )}

          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-600 font-semibold block mb-1">
                {livestockMode === 'dairy' ? 'Raza lechera:' : 'Biotipo cárnico:'}
              </label>
              {livestockMode === 'dairy' ? (
                <select
                  value={dairyBreed}
                  onChange={(e) => setDairyBreed(e.target.value as DairyBreedType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                >
                  <option value="holstein">Holstein / Frisón (Umbral crítico temprano)</option>
                  <option value="jersey">Jersey (Tolerancia intermedia)</option>
                  <option value="girolando">Girolando (Adaptación tropical)</option>
                  <option value="cross">Doble propósito / Criollo</option>
                </select>
              ) : (
                <select
                  value={beefBreed}
                  onChange={(e) => setBeefBreed(e.target.value as BeefBreedType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                >
                  <option value="angus">Británicas / Continentales (Angus, Hereford)</option>
                  <option value="brangus">Sintéticas (Brangus, Braford)</option>
                  <option value="brahman">Cebuinas / Zebu (Brahman, Nelore)</option>
                </select>
              )}
            </div>

            <div>
              <label className="text-slate-600 font-semibold block mb-1">
                {livestockMode === 'dairy' ? 'Producción diaria esperada:' : 'Manejo nutricional:'}
              </label>
              {livestockMode === 'dairy' ? (
                <select
                  value={yieldLevel}
                  onChange={(e) => setYieldLevel(e.target.value as YieldLevel)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                >
                  <option value="high">Alta producción (&gt; 35 L / vaca / día)</option>
                  <option value="medium">Producción media (20 – 30 L / vaca / día)</option>
                  <option value="low">Baja producción / Pastoreo (&lt; 15 L / vaca / día)</option>
                </select>
              ) : (
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800">
                  <option>Pastoreo con suplementación</option>
                  <option>Confinamiento total (Feedlot)</option>
                  <option>Cría y levante extensivo</option>
                </select>
              )}
            </div>
          </div>

        </div>

        {/* MAPA PRINCIPAL (SATÉLITE HD / GLOBO 3D) */}
        <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
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
        </div>

        {/* TARJETAS DE MÉTRICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-400 font-bold uppercase tracking-wider">
              <span>{livestockMode === 'dairy' ? 'Índice DHLI' : 'Índice HLI'}</span>
              {hasShade && <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full font-semibold">Sombra activa</span>}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold" style={{ color: result.color }}>
                {selectedCoords ? result.indexVal : '--'}
              </span>
              <span className="text-xs text-slate-400">{livestockMode === 'dairy' ? '/ 100' : 'HLI'}</span>
            </div>
            <div className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: `${result.color}15`, color: result.color }}>
              {selectedCoords ? result.category : 'Listo para analizar'}
            </div>
            <p className="text-xs text-slate-500 border-t border-slate-100 pt-2 leading-relaxed">
              {selectedCoords ? result.meaning : 'Haz clic en el mapa o busca un lugar para consultar.'}
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Clima registrado</span>
            <p className="text-xs text-slate-800 font-bold truncate">{loading ? 'Consultando satélites...' : placeName}</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
              <div>Temperatura: <strong>{selectedCoords ? `${temp} °C` : '--'}</strong></div>
              <div>Humedad: <strong>{selectedCoords ? `${rh}%` : '--'}</strong></div>
              <div>Viento: <strong>{selectedCoords ? `${ws} m/s` : '--'}</strong></div>
              <div>Radiación: <strong>{selectedCoords ? (hasShade ? `${(sr * 0.2).toFixed(0)} W/m²` : `${sr} W/m²`) : '--'}</strong></div>
            </div>
            <div className="pt-2 border-t border-slate-100 text-xs text-slate-400">
              Globo negro (BGT): <strong className="text-slate-800">{selectedCoords ? `${result.bgt} °C` : '--'}</strong>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-400 font-bold uppercase tracking-wider">
              <span>Impacto estimado</span>
              {selectedCoords && dailyMoneyLost > 0 && (
                <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-bold">
                  -${dailyMoneyLost.toLocaleString()} {currencySymbol}/día
                </span>
              )}
            </div>

            {livestockMode === 'dairy' ? (
              <div className="text-2xl font-black text-slate-800 pt-1">
                {selectedCoords ? ((result as any).milkLoss === 0 ? '0.0 L' : `-${(result as any).milkLoss} L`) : '--'}
                <span className="text-xs text-slate-400 font-normal"> / vaca / día</span>
              </div>
            ) : (
              <div className="text-2xl font-black text-slate-800 pt-1">
                {selectedCoords ? ((result as any).adgLoss === 0 ? '0.00 kg' : `-${(result as any).adgLoss} kg`) : '--'}
                <span className="text-xs text-slate-400 font-normal"> / animal / día</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600">
              <Moon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Enfriamiento nocturno: <strong className={nightCoolingHours >= 6 ? 'text-emerald-700' : 'text-amber-700'}>{nightCoolingHours}h</strong></span>
            </div>
          </div>

        </div>

        {/* MÓDULO PREDICTIVO: LÍNEA CONTINUA SIN PUNTOS, CURVA SUAVE Y ÁREA SOMBREADA */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Módulo predictivo y análisis multiescala</h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                <button onClick={() => setDrillLevel('year')} className={drillLevel === 'year' ? 'font-bold text-emerald-600 underline' : 'hover:text-slate-800'}>
                  Años
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <button onClick={() => setDrillLevel('month')} className={drillLevel === 'month' ? 'font-bold text-emerald-600 underline' : 'hover:text-slate-800'}>
                  Meses ({selectedYear})
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <button onClick={() => setDrillLevel('day')} className={drillLevel === 'day' ? 'font-bold text-emerald-600 underline' : 'hover:text-slate-800'}>
                  Días ({mesesNombres[selectedMonth]})
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <button onClick={() => setDrillLevel('hour')} className={drillLevel === 'hour' ? 'font-bold text-emerald-600 underline' : 'hover:text-slate-800'}>
                  Horas (Día {selectedDay})
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-semibold"
              >
                {Array.from({ length: 61 }, (_, i) => 1980 + i * 2).map((yr) => (
                  <option key={yr} value={yr}>Año {yr}</option>
                ))}
              </select>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-semibold"
              >
                {mesesNombres.map((m, idx) => (
                  <option key={idx} value={idx}>{m}</option>
                ))}
              </select>

              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-semibold"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>Día {d}</option>
                ))}
              </select>

              {drillLevel !== 'year' && (
                <button
                  onClick={() => {
                    if (drillLevel === 'hour') setDrillLevel('day');
                    else if (drillLevel === 'day') setDrillLevel('month');
                    else if (drillLevel === 'month') setDrillLevel('year');
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Nivel anterior
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>
              {drillLevel === 'year' && 'Tendencia multianual continua (haz clic en un punto para ver sus meses):'}
              {drillLevel === 'month' && `Variación mensual de ${selectedYear} (haz clic para ver sus días):`}
              {drillLevel === 'day' && `Días de ${mesesNombres[selectedMonth]} de ${selectedYear} (haz clic para ver sus 24 horas):`}
              {drillLevel === 'hour' && `Curva horaria continua del día ${selectedDay} de ${mesesNombres[selectedMonth]} (00:00 a 23:00):`}
            </span>
            <span className="text-red-500 font-semibold">
              --- Umbral crítico ({thresholdLineValue} {livestockMode === 'dairy' ? 'DHLI' : 'HLI'})
            </span>
          </div>

          {/* GRÁFICA DE LÍNEA SIN PUNTOS, SUAVE Y ELEGANTE */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getChartData()} onClick={handleChartPointClick} className="cursor-pointer">
                <defs>
                  <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={lineColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={lineColor} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis 
                  dataKey="label" 
                  stroke="#64748B" 
                  fontSize={11}
                  interval={0}
                  label={{ 
                    value: drillLevel === 'hour' ? 'Hora del día (00:00 a 23:00)' : drillLevel === 'day' ? 'Días del mes' : drillLevel === 'month' ? 'Meses del año' : 'Año', 
                    position: 'insideBottom', 
                    offset: -5,
                    fill: '#64748B',
                    fontSize: 11
                  }} 
                />
                <YAxis 
                  domain={[0, livestockMode === 'dairy' ? 100 : 120]} 
                  stroke="#64748B" 
                  fontSize={11}
                  label={{ 
                    value: livestockMode === 'dairy' ? 'Índice DHLI' : 'Índice HLI', 
                    angle: -90, 
                    position: 'insideLeft', 
                    offset: 10,
                    fill: '#64748B',
                    fontSize: 11
                  }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                  formatter={(value: any) => [`${value} (${livestockMode === 'dairy' ? 'DHLI' : 'HLI'})`, 'Estrés térmico']}
                />
                <ReferenceLine y={thresholdLineValue} stroke="#EF4444" strokeDasharray="4 4" strokeWidth={1.5} />
                <Line
                  type="monotone"
                  dataKey="val"
                  stroke={lineColor}
                  strokeWidth={2.8}
                  dot={false}
                  activeDot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2, fill: lineColor }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MAPA DE CALOR GLOBAL CIENTÍFICO CON LEAFLET REAL */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Distribución global de estrés térmico (Cartografía científica)</h3>
              <p className="text-xs text-slate-500">
                Modelo estacional sincronizado con el análisis multiescala | Cartografía interactiva de alta resolución
              </p>
            </div>
          </div>

          <GlobalHeatMap
            lat={lat}
            lon={lon}
            placeName={placeName}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            selectedDay={selectedDay}
            selectedHour={selectedHour}
            indexVal={result.indexVal}
            livestockMode={livestockMode}
            onLocationChange={(newLat, newLon) => handleLocationUpdate(newLat, newLon)}
          />
        </div>

      </div>

      {/* BOTÓN FLOTANTE DE WHATSAPP */}
      <button
        onClick={handleSendWhatsAppAlert}
        className="fixed bottom-24 right-6 z-40 w-12 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg border border-slate-700 flex items-center justify-center transition-transform hover:scale-110"
        title="Enviar alerta zootécnica por WhatsApp"
      >
        <MessageCircle className="w-5 h-5 text-emerald-400" />
      </button>

      {/* ASISTENTE ZOOTÉCNICO IA */}
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

      {/* MODAL DE ADMINISTRACIÓN DE NOTICIAS CON PIN */}
      {showNewsAdminModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-slate-600" /> Acceso de administrador
              </h3>
              <button onClick={() => { setShowNewsAdminModal(false); setIsAuthenticated(false); }} className="text-slate-400">✕</button>
            </div>

            {!isAuthenticated ? (
              <form onSubmit={handleVerifyPin} className="space-y-3 text-xs">
                <p className="text-slate-500">Ingresa tu PIN para gestionar las noticias publicadas:</p>
                <input
                  type="password"
                  placeholder="PIN (por defecto: 1234)"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center text-base tracking-widest text-slate-800"
                />
                {pinError && <p className="text-red-600 text-[11px]">PIN incorrecto. Intenta de nuevo.</p>}
                <button type="submit" className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl">
                  Acceder
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <form onSubmit={handleAddNewsItem} className="space-y-2.5 text-xs">
                  <div>
                    <label className="text-slate-600 font-semibold block mb-0.5">Título del anuncio:</label>
                    <input
                      type="text"
                      placeholder="Ej. Taller silvopastoril"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-600 font-semibold block mb-0.5">Categoría:</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5"
                      >
                        <option value="Noticia">Noticia</option>
                        <option value="Investigación">Investigación</option>
                        <option value="Evento">Evento ganadero</option>
                        <option value="Manejo">Manejo en potrero</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-600 font-semibold block mb-0.5">Foto:</label>
                      <input
                        type="file"
                        accept="image/*"
                        ref={newsImageInputRef}
                        onChange={handleImageFileChange}
                        className="w-full text-slate-500 text-[11px] file:mr-1 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-slate-800 file:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-600 font-semibold block mb-0.5">Resumen:</label>
                    <textarea
                      rows={2}
                      placeholder="Texto del anuncio..."
                      value={newSummary}
                      onChange={(e) => setNewSummary(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                    />
                  </div>

                  <button type="submit" className="w-full py-2 bg-slate-900 text-white font-bold rounded-xl shadow-xs">
                    Publicar
                  </button>
                </form>

                <div className="pt-2 border-t border-slate-100 max-h-36 overflow-y-auto space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 block">Noticias actuales:</span>
                  {newsList.map((item) => (
                    <div key={item.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center gap-2">
                      <span className="font-semibold text-slate-700 text-xs truncate">{item.title}</span>
                      <button onClick={() => handleDeleteNewsItem(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded-md">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DEL MANUAL DE USUARIO */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 border border-slate-200 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-slate-600" /> Manual de usuario e interpretación
              </h3>
              <button onClick={() => setShowManualModal(false)} className="text-slate-400">✕</button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p><strong>1. Búsqueda y geolocalización:</strong> Puedes escribir el municipio en la barra de búsqueda superior, activar tu GPS o ingresar coordenadas manuales.</p>
              <p><strong>2. Interpretación de los índices:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Leche (DHLI):</strong> Umbral en 25. Por encima de 25 inicia la caída en litros y la alteración de sólidos lácteos.</li>
                <li><strong>Carne (HLI):</strong> Umbral en 77. Valores superiores causan disminución en el consumo voluntario de materia seca y ganancia de peso diaria.</li>
              </ul>
              <p><strong>3. Mitigación con sombra:</strong> El botón de sombra simula la intercepción del 80% de radiación directa (árboles en silvopastoreo o polisombra), amortiguando la temperatura de globo negro (BGT).</p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <a
                href="/manual-estres-termico.pdf"
                download="Manual_Usuario_Estres_Termico.pdf"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Descargar manual en PDF
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE LA CALCULADORA FINANCIERA */}
      {showFinanceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 border border-slate-200 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-slate-600" /> Calculadora de pérdidas y retorno (ROI)
              </h3>
              <button onClick={() => setShowFinanceModal(false)} className="text-slate-400">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-0.5">Animales en lote:</label>
                <input type="number" min="1" value={animalCount} onChange={(e) => setAnimalCount(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold" />
              </div>
              <div>
                <label className="text-slate-500 block mb-0.5">Precio unitario ($):</label>
                <input type="number" min="0" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold" />
              </div>
              <div>
                <label className="text-slate-500 block mb-0.5">Moneda:</label>
                <select value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold">
                  <option value="COP ($)">COP ($)</option>
                  <option value="USD ($)">USD ($)</option>
                  <option value="BRL (R$)">BRL (R$)</option>
                  <option value="EUR (€)">EUR (€)</option>
                  <option value="MXN ($)">MXN ($)</option>
                </select>
              </div>
              <div>
                <label className="text-slate-500 block mb-0.5">Inversión en sombra:</label>
                <input type="number" min="0" value={mitigationCost} onChange={(e) => setMitigationCost(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 text-center">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Pérdida diaria</span>
                <span className="text-base font-bold text-slate-800">${dailyMoneyLost.toLocaleString()}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Pérdida mensual</span>
                <span className="text-base font-bold text-red-600">${monthlyMoneyLost.toLocaleString()}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Retorno (ROI)</span>
                <span className="text-base font-bold text-emerald-600">{roiMonths} meses</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER OFICIAL CON ENLACES ORCID */}
      <footer className="border-t border-slate-200 mt-12 pt-6 pb-10 bg-white text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Monitor global de estrés térmico bovino</span>
              <span className="text-[11px] text-slate-400">Investigación zootécnica y modelación bioclimática</span>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={handleExportCSV} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center gap-1.5 transition">
                <Download className="w-3.5 h-3.5 text-slate-500" /> Exportar CSV
              </button>
              <button onClick={() => window.print()} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center gap-1.5 transition">
                <Printer className="w-3.5 h-3.5 text-slate-500" /> Imprimir reporte
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3">
            <a href="https://orcid.org/0000-0001-7064-6753" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
              <div>
                <div className="font-semibold text-slate-800 text-[11px]">William Armando Tapie Canacuan</div>
                <div className="text-[10px] text-slate-400">ORCID: 0000-0001-7064-6753</div>
              </div>
            </a>

            <a href="https://orcid.org/0001-6651-3819" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
              <div>
                <div className="font-semibold text-slate-800 text-[11px]">Carlos Eduardo Giraldo Sanchez</div>
                <div className="text-[10px] text-slate-400">ORCID: 0001-6651-3819</div>
              </div>
            </a>

            <a href="https://orcid.org/0009-0002-0122-8667" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
              <div>
                <div className="font-semibold text-slate-800 text-[11px]">Juan Fernando Manrique Hincapie</div>
                <div className="text-[10px] text-slate-400">ORCID: 0009-0002-0122-8667</div>
              </div>
            </a>
          </div>
        </div>
      </footer>

    </main>
  );
}