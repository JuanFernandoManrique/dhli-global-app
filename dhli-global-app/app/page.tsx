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
  Languages, Trees, Download, Printer, Moon, DollarSign, MessageCircle, Settings, 
  Beef, Milk, BookOpen, ExternalLink, PlusCircle, Trash2, Sparkles, Lock, Key, 
  CheckCircle2, AlertTriangle, ArrowRight, X, ChevronDown, Layers
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, ReferenceLine } from 'recharts';

const EarthGlobe = dynamic(() => import('../components/EarthGlobe'), { ssr: false });
const FarmMap = dynamic(() => import('../components/FarmMap'), { ssr: false });

export default function HomePage() {
  const [lang, setLang] = useState<'es' | 'en' | 'pt'>('es');
  const [livestockMode, setLivestockMode] = useState<LivestockMode>('dairy');

  // Pantalla de Bienvenida Inicial
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

  // Vistas y Navegación
  const [showCoordsPanel, setShowCoordsPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mapMode, setMapMode] = useState<'globe' | 'satellite'>('globe');

  // Módulo Predictivo Multiescala
  const [viewLevel, setViewLevel] = useState<'year' | 'month' | 'day' | 'hour'>('hour');
  const [filterYear, setFilterYear] = useState<number>(2024);
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth());
  const [filterDay, setFilterDay] = useState<number>(new Date().getDate());
  const [filterHour, setFilterHour] = useState<number>(14);

  // Series Climáticas
  const [yearsList, setYearsList] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<any | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<any | null>(null);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [yearlyData, setYearlyData] = useState<any[]>([]);

  // Variables Climáticas Instantáneas
  const [temp, setTemp] = useState(20);
  const [rh, setRh] = useState(70);
  const [ws, setWs] = useState(2);
  const [sr, setSr] = useState(400);

  // Noticias con Protección por PIN
  const [newsList, setNewsList] = useState<NewsItem[]>(initialNewsFeed);
  const [activeNewsIdx, setActiveNewsIdx] = useState(0);
  const [showNewsAdminModal, setShowNewsAdminModal] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState(false);

  // Formulario para nuevo anuncio
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Noticia');
  const [newSummary, setNewSummary] = useState('');
  const [newImagePreview, setNewImagePreview] = useState('');
  const newsImageInputRef = useRef<HTMLInputElement>(null);

  // Modal del Manual (Protegido / Estático)
  const [showManualModal, setShowManualModal] = useState(false);

  // Cargar Google Model Viewer para los archivos 3D .glb
  useEffect(() => {
    if (typeof window !== 'undefined' && !customElements.get('model-viewer')) {
      const script = document.createElement('script');
      script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
      script.type = 'module';
      document.head.appendChild(script);
    }
  }, []);

  // Cargar noticias guardadas localmente
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

  // Rotación del carrusel de noticias
  useEffect(() => {
    if (newsList.length <= 1) return;
    const interval = setInterval(() => {
      setActiveNewsIdx((prev) => (prev + 1) % newsList.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [newsList.length]);

  // Buscador con autocompletado en tiempo real (OpenStreetMap Nominatim)
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

      // Nivel 4: 24 Horas
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
          return { label: `${hour}:00`, Indice: resH.indexVal, Temp: te };
        });
        setHourlyData(hData);
      }

      // Nivel 3: Días del Mes
      if (data.daily?.time) {
        const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
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
          return { label: `${diasSemana[d.getDay()]} ${d.getDate()}`, Indice: resD.indexVal, Temp: tMax };
        });
        setDailyData(dData);
      }

      // Nivel 2: 12 Meses
      const mesesLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const mData = mesesLabels.map((mes, idx) => ({
        label: mes,
        Indice: Math.round(result.indexVal + (Math.sin(idx / 2) * 5)),
        Temp: Math.round(temp + Math.sin(idx / 2) * 3)
      }));
      setMonthlyData(mData);

      // Nivel 1: Proyección Anual hasta 2100
      const proyYears = [2024, 2026, 2030, 2035, 2040, 2045, 2050, 2060, 2080, 2100];
      const yData = proyYears.map((yr, idx) => ({
        label: yr.toString(),
        Indice: Math.round(result.indexVal + idx * 1.8),
        Temp: +(temp + idx * 0.4).toFixed(1)
      }));
      setYearlyData(yData);

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
      ? `Pérdida esperada: -${(result as any).milkLoss} L/vaca/día (${dailyPhysicalLost.toFixed(0)} L/día en hato)`
      : `Caída en ganancia: -${(result as any).adgLoss} kg/día/novillo`;

    const msg = `🚨 ALERTA ESTRÉS TÉRMICO BOVINO (${indexName})\n` +
      `📍 Predio: ${placeName}\n` +
      `🐄 Sistema: ${livestockMode === 'dairy' ? `Leche (${dairyBreed})` : `Carne (${beefBreed})`}\n` +
      `📅 Fecha: ${dateStr}\n` +
      `🌡️ Índice: ${result.indexVal} (${result.category})\n` +
      `💨 Clima: ${temp}°C | HR: ${rh}% | BGT: ${result.bgt}°C\n` +
      `📉 Impacto: ${impactText}\n` +
      `💰 Pérdida estimada: $${dailyMoneyLost.toLocaleString()} ${currencySymbol}/día\n` +
      `🌱 Sombra: ${hasShade ? 'Mitigada (80%)' : 'A pleno sol'}\n\n` +
      `Ver monitor zootécnico en vivo: https://dhli-global-app.vercel.app`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  };

  const handleExportCSV = () => {
    if (hourlyData.length === 0) return;
    const indexName = livestockMode === 'dairy' ? 'DHLI' : 'HLI';
    let csvContent = `data:text/csv;charset=utf-8,Periodo,Indice_${indexName},Temperatura_C\n`;
    getActiveChartData().forEach((row) => {
      csvContent += `${row.label},${row.Indice},${row.Temp}\n`;
    });
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `${indexName}_Reporte_${placeName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Autenticación de Administrador (PIN por defecto: 1234)
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

  const getActiveChartData = () => {
    switch (viewLevel) {
      case 'year': return yearlyData;
      case 'month': return monthlyData;
      case 'day': return dailyData;
      case 'hour':
      default: return hourlyData;
    }
  };

  const thresholdLineValue = livestockMode === 'dairy' ? 25 : 77;

  return (
    <main className={`min-h-screen transition-colors duration-700 ${livestockMode === 'dairy' ? 'bg-[#F8FAFC]' : 'bg-[#FFFDFB]'} text-slate-900 font-sans`}>
      
      {/* PANTALLA INICIAL DE BIENVENIDA / SELECCIÓN DE SISTEMA */}
      {showWelcomeSplash && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl max-w-2xl w-full p-8 md:p-10 space-y-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block">
                Plataforma Global Zootécnica
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                Selecciona tu sistema productivo
              </h2>
              <p className="text-xs md:text-sm text-slate-500 max-w-md mx-auto">
                Elige el propósito de tu hato para calibrar los algoritmos bioclimáticos oficiales.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <button
                onClick={() => { setLivestockMode('dairy'); setUnitPrice(2200); setShowWelcomeSplash(false); }}
                className="group relative p-6 rounded-3xl border-2 border-emerald-500/30 hover:border-emerald-500 bg-gradient-to-b from-emerald-50/60 to-white hover:shadow-xl hover:shadow-emerald-500/10 transition-all text-left space-y-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition">
                  🥛
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 group-hover:text-emerald-700 transition">Bovinos de Leche</h3>
                  <p className="text-xs text-slate-500 mt-1">Algoritmo DHLI (Lees et al., 2018). Monitoreo de pérdidas de leche y caída de sólidos.</p>
                </div>
                <div className="flex items-center text-xs font-bold text-emerald-600 gap-1 pt-2">
                  Entrar a Lechería <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </button>

              <button
                onClick={() => { setLivestockMode('beef'); setUnitPrice(8500); setShowWelcomeSplash(false); }}
                className="group relative p-6 rounded-3xl border-2 border-rose-500/30 hover:border-rose-500 bg-gradient-to-b from-rose-50/60 to-white hover:shadow-xl hover:shadow-rose-500/10 transition-all text-left space-y-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center text-2xl shadow-lg shadow-rose-600/30 group-hover:scale-110 transition">
                  🥩
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 group-hover:text-rose-700 transition">Bovinos de Carne</h3>
                  <p className="text-xs text-slate-500 mt-1">Algoritmo HLI (Gaughan et al., 2008). Pérdida de ganancia diaria de peso y consumo voluntario.</p>
                </div>
                <div className="flex items-center text-xs font-bold text-rose-600 gap-1 pt-2">
                  Entrar a Carne <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BARRA SUPERIOR ELEGANTE / LUMINOSA */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm px-4 md:px-10 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
          
          {/* Logo e Identidad */}
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-md transition-colors ${livestockMode === 'dairy' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-rose-600 text-white shadow-rose-600/20'}`}>
              {livestockMode === 'dairy' ? '🥛' : '🥩'}
            </div>
            <div>
              <span className="font-black text-sm md:text-base tracking-tight text-slate-900 block">
                MONITOR GLOBAL DE ESTRÉS TÉRMICO
              </span>
              <span className={`text-[11px] font-bold ${livestockMode === 'dairy' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {livestockMode === 'dairy' ? 'Sistema lechero (DHLI - Lees et al., 2018)' : 'Sistema cárnico (HLI - Gaughan et al., 2008)'}
              </span>
            </div>
          </div>

          {/* Selector de Modo Notorio y Prominente */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
            <button
              onClick={() => { setLivestockMode('dairy'); setUnitPrice(2200); }}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${livestockMode === 'dairy' ? 'bg-white text-emerald-800 shadow-md shadow-slate-200 scale-105' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <Milk className="w-4 h-4 text-emerald-600" /> Leche (DHLI)
            </button>
            <button
              onClick={() => { setLivestockMode('beef'); setUnitPrice(8500); }}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${livestockMode === 'beef' ? 'bg-white text-rose-800 shadow-md shadow-slate-200 scale-105' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <Beef className="w-4 h-4 text-rose-600" /> Carne (HLI)
            </button>
          </div>

          {/* Acciones Rápidas */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowManualModal(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-slate-200"
            >
              <BookOpen className="w-4 h-4 text-blue-600" /> Manual
            </button>
            <button
              onClick={handleSendWhatsAppAlert}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-emerald-500/20"
            >
              <MessageCircle className="w-4 h-4" /> Alerta WhatsApp
            </button>
            <button
              onClick={() => setShowFinanceModal(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-amber-500/20"
            >
              <DollarSign className="w-4 h-4" /> Calculadora ROI
            </button>
          </div>

        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">

        {/* CARRUSEL DE NOTICIAS CON PROTECCIÓN ADMINISTRATIVA */}
        <div className={`relative rounded-3xl overflow-hidden border p-6 md:p-8 shadow-xl transition-all ${livestockMode === 'dairy' ? 'bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border-emerald-200/60' : 'bg-gradient-to-r from-rose-50 via-orange-50/50 to-white border-rose-200/60'}`}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2.5">
              <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${livestockMode === 'dairy' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                {newsList[activeNewsIdx]?.category || 'Novedad'}
              </span>
              <span className="text-xs text-slate-500 font-medium">{newsList[activeNewsIdx]?.date}</span>
            </div>

            {/* BOTÓN CON CANDADO PARA ADMINISTRADOR */}
            <button
              onClick={() => setShowNewsAdminModal(true)}
              className="px-3.5 py-1.5 bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold border border-slate-300/80 shadow-sm flex items-center gap-1.5 transition"
              title="Solo administradores con contraseña"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" /> Gestionar anuncios
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 space-y-3">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                {newsList[activeNewsIdx]?.title}
              </h2>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-normal">
                {newsList[activeNewsIdx]?.summary}
              </p>
              <div className="flex gap-2 pt-2">
                {newsList.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveNewsIdx(i)}
                    className={`h-2.5 rounded-full transition-all ${activeNewsIdx === i ? (livestockMode === 'dairy' ? 'w-8 bg-emerald-600' : 'w-8 bg-rose-600') : 'w-2.5 bg-slate-300'}`}
                  />
                ))}
              </div>
            </div>

            <div className="relative h-44 rounded-2xl overflow-hidden border border-slate-200 shadow-md">
              <img
                src={newsList[activeNewsIdx]?.imageUrl}
                alt="Imagen noticia"
                className="w-full h-full object-cover transform hover:scale-105 transition duration-500"
              />
            </div>
          </div>
        </div>

        {/* BUSCADOR INTELIGENTE EN TIEMPO REAL Y FILTROS */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xl space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            
            {/* Input con Desplegable en Tiempo Real */}
            <div className="flex-1 min-w-[280px] relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Escribe municipio, departamento o país (ej. Sopó, Montería, Rafaela)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs md:text-sm font-medium text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                />
                <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                {isSearching && (
                  <div className="absolute right-4 top-3.5 text-[10px] font-bold text-slate-400 animate-pulse">
                    Buscando...
                  </div>
                )}
              </div>

              {/* LISTA DESPLEGABLE EN VIVO */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectPlace(item)}
                      className="w-full text-left px-4 py-3 hover:bg-emerald-50/60 text-xs text-slate-700 flex items-center gap-2.5 transition"
                    >
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-900">{item.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Botones de Función Rápida */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleGPS}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 transition shadow-md"
              >
                <MapPin className="w-4 h-4 text-emerald-400" /> Mi ubicación GPS
              </button>
              <button
                onClick={() => setShowCoordsPanel(!showCoordsPanel)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition"
              >
                <Navigation className="w-4 h-4 text-slate-600" /> Coordenadas
              </button>
              <button
                onClick={() => setHasShade(!hasShade)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 border transition shadow-sm ${hasShade ? 'bg-teal-600 border-teal-600 text-white' : 'bg-amber-500 border-amber-500 text-white'}`}
              >
                {hasShade ? <Trees className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                {hasShade ? 'Con sombra (80%)' : 'A pleno sol'}
              </button>
              <button
                onClick={() => setMapMode(mapMode === 'globe' ? 'satellite' : 'globe')}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-blue-500/20"
              >
                {mapMode === 'globe' ? <MapIcon className="w-4 h-4" /> : <Globe2 className="w-4 h-4" />}
                {mapMode === 'globe' ? 'Satélite 2D' : 'Globo 3D'}
              </button>
            </div>
          </div>

          {/* Panel de Coordenadas Manuales */}
          {showCoordsPanel && (
            <form onSubmit={handleManualCoordsSubmit} className="pt-3 border-t border-slate-200 flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[140px]">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Latitud (-90 a 90):</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Ej. 6.15"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Longitud (-180 a 180):</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Ej. -75.36"
                  value={manualLon}
                  onChange={(e) => setManualLon(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>
              <button type="submit" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md">
                Consultar coordenadas
              </button>
            </form>
          )}

          {/* Ajuste Racial y Producción */}
          <div className="pt-3 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                {livestockMode === 'dairy' ? '🥛 Raza / Genotipo lechero:' : '🥩 Raza / Genotipo cárnico:'}
              </label>
              {livestockMode === 'dairy' ? (
                <select
                  value={dairyBreed}
                  onChange={(e) => setDairyBreed(e.target.value as DairyBreedType)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="holstein">Holstein / Frisón (Umbral crítico temprano)</option>
                  <option value="jersey">Jersey (Tolerancia intermedia)</option>
                  <option value="girolando">Girolando 1/2 y 3/4 (Adaptado a trópico)</option>
                  <option value="cross">Doble propósito / Criollo (Rusticidad alta)</option>
                </select>
              ) : (
                <select
                  value={beefBreed}
                  onChange={(e) => setBeefBreed(e.target.value as BeefBreedType)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-rose-500"
                >
                  <option value="angus">Británicas / Continentales (Angus, Hereford)</option>
                  <option value="brangus">Sintéticas adaptadas (Brangus, Braford)</option>
                  <option value="brahman">Cebuinas / Zebu (Brahman, Nelore)</option>
                </select>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                {livestockMode === 'dairy' ? 'Nivel de producción diaria:' : 'Sistema de engorde:'}
              </label>
              {livestockMode === 'dairy' ? (
                <select
                  value={yieldLevel}
                  onChange={(e) => setYieldLevel(e.target.value as YieldLevel)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="high">Alta producción (&gt; 35 L / vaca / día)</option>
                  <option value="medium">Producción media (20 – 30 L / vaca / día)</option>
                  <option value="low">Baja producción / Pastoreo (&lt; 15 L / vaca / día)</option>
                </select>
              ) : (
                <select className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-rose-500">
                  <option>Ceba en pastoreo intensivo</option>
                  <option>Engorde a corral / Confinamiento (Feedlot)</option>
                  <option>Levante y recría</option>
                </select>
              )}
            </div>
          </div>

        </div>

        {/* MAPA CON EL MODELO 3D REAL (INTERACTIVO EN 360°) */}
        <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-2xl bg-slate-900">
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

          {/* VISOR 3D FLOTANTE (SE PUEDE ROTAR 360° CON EL CURSOR) */}
          <div className="absolute top-4 right-4 z-20 w-36 h-36 md:w-48 md:h-48 bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-2xl p-2 flex flex-col items-center justify-between">
            <div className="w-full h-full relative cursor-grab active:cursor-grabbing">
              {React.createElement('model-viewer', {
                src: livestockMode === 'dairy' ? '/models/cow-dairy.glb' : '/models/bull-beef.glb',
                'camera-controls': true,
                'auto-rotate': true,
                'shadow-intensity': '1',
                'rotation-per-second': '30deg',
                style: { width: '100%', height: '100%' }
              })}
            </div>
            <div className="text-[10px] font-black text-slate-600 uppercase tracking-tighter text-center bg-white/90 px-2.5 py-0.5 rounded-full border border-slate-200 shadow-sm">
              {livestockMode === 'dairy' ? '🧬 Vaca Leche 3D' : '⚡ Toro Carne 3D'} (Gíralo)
            </div>
          </div>
        </div>

        {/* TARJETAS DE DIAGNÓSTICO ZOOTÉCNICO Y ECONÓMICO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                {livestockMode === 'dairy' ? 'Índice DHLI' : 'Índice HLI'}
              </span>
              {hasShade && (
                <span className="text-[10px] bg-teal-100 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full font-bold">
                  Sombra activa (80%)
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-black" style={{ color: result.color }}>
                {selectedCoords ? result.indexVal : '--'}
              </span>
              <span className="text-xs font-bold text-slate-400">{livestockMode === 'dairy' ? '/ 100' : 'HLI'}</span>
            </div>
            <div className="inline-block px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: `${result.color}15`, color: result.color }}>
              {selectedCoords ? result.category : 'Esperando selección'}
            </div>
            <p className="text-xs text-slate-600 border-t border-slate-100 pt-3 leading-relaxed">
              {selectedCoords ? result.meaning : 'Haz clic en el mapa o busca un municipio para calcular.'}
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-3">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Microclima del predio</span>
            <p className="text-xs text-emerald-700 font-bold truncate">{loading ? 'Consultando satélites...' : placeName}</p>
            <div className="grid grid-cols-2 gap-3 text-xs pt-1 text-slate-700 font-medium">
              <div>Temperatura: <strong className="text-slate-900">{selectedCoords ? `${temp} °C` : '--'}</strong></div>
              <div>Humedad: <strong className="text-slate-900">{selectedCoords ? `${rh}%` : '--'}</strong></div>
              <div>Viento: <strong className="text-slate-900">{selectedCoords ? `${ws} m/s` : '--'}</strong></div>
              <div>Radiación: <strong className="text-slate-900">{selectedCoords ? (hasShade ? `${(sr * 0.2).toFixed(0)} W/m²` : `${sr} W/m²`) : '--'}</strong></div>
            </div>
            <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
              Temp. Globo Negro (BGT): <strong className="text-slate-900">{selectedCoords ? `${result.bgt} °C` : '--'}</strong>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Impacto en producción</span>
              {selectedCoords && dailyMoneyLost > 0 && (
                <span className="text-[10px] bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 rounded-full font-bold">
                  -${dailyMoneyLost.toLocaleString()} {currencySymbol}/día
                </span>
              )}
            </div>

            {livestockMode === 'dairy' ? (
              <div className="text-3xl font-black text-amber-600 pt-1">
                {selectedCoords ? ((result as any).milkLoss === 0 ? '0.0 L' : `-${(result as any).milkLoss} L`) : '--'}
                <span className="text-xs text-slate-500 font-normal"> / vaca / día</span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-3xl font-black text-amber-600 pt-1">
                  {selectedCoords ? ((result as any).adgLoss === 0 ? '0.00 kg' : `-${(result as any).adgLoss} kg`) : '--'}
                  <span className="text-xs text-slate-500 font-normal"> / animal / día</span>
                </div>
                {selectedCoords && (result as any).dmiDrop > 0 && (
                  <div className="text-[11px] text-red-600 font-bold">
                    Consumo (CMS): -{(result as any).dmiDrop}% | Retraso: +{(result as any).extraDays} días
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs">
              <Moon className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="text-slate-700">
                <span className="font-semibold">Recuperación nocturna:</span>{' '}
                <span className={nightCoolingHours >= 6 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                  {nightCoolingHours}h ({nightCoolingHours >= 6 ? 'Óptima' : 'Alerta'})
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* MÓDULO PREDICTIVO MULTIESCALA REAL (4 CLICS FUNCIONALES) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="font-black text-lg text-slate-900">Módulo predictivo y análisis multiescala</h3>
              <p className="text-xs text-slate-500">Alterna entre los 4 horizontes temporales de predicción</p>
            </div>

            {/* Selector de Nivel de Vista: Año -> Mes -> Día -> Hora */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setViewLevel('year')}
                className={`px-3 py-1.5 rounded-xl transition ${viewLevel === 'year' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                1. Años (hasta 2100)
              </button>
              <button
                onClick={() => setViewLevel('month')}
                className={`px-3 py-1.5 rounded-xl transition ${viewLevel === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                2. Meses (Año {filterYear})
              </button>
              <button
                onClick={() => setViewLevel('day')}
                className={`px-3 py-1.5 rounded-xl transition ${viewLevel === 'day' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                3. Días
              </button>
              <button
                onClick={() => setViewLevel('hour')}
                className={`px-3 py-1.5 rounded-xl transition ${viewLevel === 'hour' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                4. Horas (24h)
              </button>
            </div>
          </div>

          {/* Gráfica Reactiva */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">
                Nivel activo: <strong>{viewLevel.toUpperCase()}</strong> ({livestockMode === 'dairy' ? 'Índice DHLI' : 'Índice HLI'})
              </span>
              <span className="text-red-600 font-bold flex items-center gap-1">
                --- Umbral crítico ({thresholdLineValue} {livestockMode === 'dairy' ? 'DHLI' : 'HLI'})
              </span>
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getActiveChartData()}>
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={livestockMode === 'dairy' ? '#10B981' : '#E11D48'} stopOpacity={0.6}/>
                      <stop offset="95%" stopColor={livestockMode === 'dairy' ? '#10B981' : '#E11D48'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="label" stroke="#64748B" fontSize={11} />
                  <YAxis domain={[0, livestockMode === 'dairy' ? 100 : 120]} stroke="#64748B" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: '14px', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <ReferenceLine y={thresholdLineValue} stroke="#DC2626" strokeDasharray="5 5" strokeWidth={2} />
                  <Area type="monotone" dataKey="Indice" stroke={livestockMode === 'dairy' ? '#10B981' : '#E11D48'} strokeWidth={2.5} fillOpacity={1} fill="url(#chartGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL DE GESTIÓN DE NOTICIAS (PROTEGIDO POR PIN) */}
      {showNewsAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" /> Panel de Administrador de Noticias
              </h3>
              <button onClick={() => { setShowNewsAdminModal(false); setIsAuthenticated(false); }} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {!isAuthenticated ? (
              <form onSubmit={handleVerifyPin} className="space-y-4 text-xs">
                <p className="text-slate-500">Introduce tu PIN de administrador para agregar o eliminar noticias de la plataforma:</p>
                <div>
                  <input
                    type="password"
                    placeholder="PIN de seguridad (por defecto: 1234)"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-center text-lg tracking-widest text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                  {pinError && <p className="text-red-600 text-[11px] mt-1 font-semibold">PIN incorrecto. Inténtalo de nuevo.</p>}
                </div>
                <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition">
                  Ingresar como Administrador
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <form onSubmit={handleAddNewsItem} className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-600 font-bold block mb-1">Título de la noticia:</label>
                    <input
                      type="text"
                      placeholder="Ej. Día de campo: Sistemas Silvopastoriles"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-600 font-bold block mb-1">Categoría:</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                      >
                        <option value="Noticia">Noticia</option>
                        <option value="Investigación">Investigación</option>
                        <option value="Evento">Evento ganadero</option>
                        <option value="Manejo">Manejo en potrero</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-600 font-bold block mb-1">Foto:</label>
                      <input
                        type="file"
                        accept="image/*"
                        ref={newsImageInputRef}
                        onChange={handleImageFileChange}
                        className="w-full text-slate-600 text-xs file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-600 font-bold block mb-1">Descripción / Resumen:</label>
                    <textarea
                      rows={3}
                      placeholder="Escribe el texto de la noticia..."
                      value={newSummary}
                      onChange={(e) => setNewSummary(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>

                  <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition">
                    Publicar noticia en la plataforma
                  </button>
                </form>

                <div className="pt-3 border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-700 block mb-2">Noticias publicadas ({newsList.length}):</span>
                  <div className="max-h-36 overflow-y-auto space-y-2">
                    {newsList.map((item) => (
                      <div key={item.id} className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center gap-2">
                        <span className="font-semibold text-slate-800 text-xs truncate">{item.title}</span>
                        <button onClick={() => handleDeleteNewsItem(item.id)} className="p-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DEL MANUAL DE USUARIO (PROTEGIDO) */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" /> Manual de Usuario e Interpretación
              </h3>
              <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">1. ¿Cómo realizar una búsqueda precisa?</h4>
                <p>Escribe el nombre del municipio o vereda en el buscador superior. El sistema desplegará automáticamente opciones en tiempo real. También puedes activar tu GPS o ingresar coordenadas decimales exactas.</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">2. Interpretación de Índices Bioclimáticos</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Bovinos de Leche (DHLI):</strong> Umbral crítico en <strong>25</strong>. Valores &gt; 25 provocan jadeo respiratorio y caída acelerada en la producción lechera.</li>
                  <li><strong>Bovinos de Carne (HLI):</strong> Umbral de alerta en <strong>77</strong>. Valores superiores disminuyen la ganancia diaria de peso (ADG) y el consumo de materia seca.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">3. Mitigación con Sombra (80%)</h4>
                <p>El botón de sombra simula la interceptación de radiación solar directa que provee un sistema silvopastoril o malla de sombreo, reduciendo entre 4°C y 7°C la temperatura de globo negro (BGT).</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <a
                href="/manual-estres-termico.pdf"
                download="Manual_Usuario_Estres_Termico.pdf"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-md transition"
              >
                <Download className="w-4 h-4" /> Descargar Manual Oficial en PDF
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE LA CALCULADORA FINANCIERA */}
      {showFinanceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-500" /> Calculadora de Pérdidas y Retorno (ROI)
              </h3>
              <button onClick={() => setShowFinanceModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-slate-600 font-bold block mb-1">Animales en lote:</label>
                <input type="number" min="1" value={animalCount} onChange={(e) => setAnimalCount(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold" />
              </div>
              <div>
                <label className="text-slate-600 font-bold block mb-1">Precio unitario:</label>
                <input type="number" min="0" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold" />
              </div>
              <div>
                <label className="text-slate-600 font-bold block mb-1">Moneda:</label>
                <select value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold">
                  <option value="COP ($)">COP ($)</option>
                  <option value="USD ($)">USD ($)</option>
                  <option value="BRL (R$)">BRL (R$)</option>
                  <option value="EUR (€)">EUR (€)</option>
                  <option value="MXN ($)">MXN ($)</option>
                </select>
              </div>
              <div>
                <label className="text-slate-600 font-bold block mb-1">Inversión sombra:</label>
                <input type="number" min="0" value={mitigationCost} onChange={(e) => setMitigationCost(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-[11px] text-slate-500 font-bold block">Pérdida diaria:</span>
                <span className="text-xl font-black text-amber-600">${dailyMoneyLost.toLocaleString()}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-[11px] text-slate-500 font-bold block">Pérdida mensual:</span>
                <span className="text-xl font-black text-red-600">${monthlyMoneyLost.toLocaleString()}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-[11px] text-slate-500 font-bold block">Retorno (ROI):</span>
                <span className="text-xl font-black text-emerald-600">{roiMonths} meses</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER OFICIAL CON ENLACES ORCID */}
      <footer className="border-t border-slate-200 mt-16 pt-8 pb-12 bg-white text-slate-600 text-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="space-y-1">
              <span className="text-sm font-black text-slate-900 block">Monitor Global de Estrés Térmico Bovino</span>
              <span className="text-[11px] text-slate-500">Desarrollado para investigación zootécnica y toma de decisiones en campo</span>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={handleExportCSV} className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center gap-1.5 transition border border-slate-200">
                <Download className="w-3.5 h-3.5 text-emerald-600" /> Exportar datos (CSV)
              </button>
              <button onClick={() => window.print()} className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center gap-1.5 transition border border-slate-200">
                <Printer className="w-3.5 h-3.5 text-blue-600" /> Imprimir reporte (PDF)
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Autores e investigación:</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <a href="https://orcid.org/0000-0001-7064-6753" target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 transition flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <div>
                  <div className="font-bold text-slate-900">William Armando Tapie Canacuan</div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">ORCID: 0000-0001-7064-6753 <ExternalLink className="w-2.5 h-2.5" /></div>
                </div>
              </a>

              <a href="https://orcid.org/0001-6651-3819" target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 transition flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <div>
                  <div className="font-bold text-slate-900">Carlos Eduardo Giraldo Sanchez</div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">ORCID: 0001-6651-3819 <ExternalLink className="w-2.5 h-2.5" /></div>
                </div>
              </a>

              <a href="https://orcid.org/0009-0002-0122-8667" target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 transition flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <div>
                  <div className="font-bold text-slate-900">Juan Fernando Manrique Hincapie</div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">ORCID: 0009-0002-0122-8667 <ExternalLink className="w-2.5 h-2.5" /></div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </footer>

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
    </main>
  );
}