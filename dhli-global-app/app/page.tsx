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
  Beef, Milk, BookOpen, ExternalLink, PlusCircle, Trash2, Lock, ArrowLeft, ArrowRight, X, Languages
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

const EarthGlobe = dynamic(() => import('../components/EarthGlobe'), { ssr: false });
const FarmMap = dynamic(() => import('../components/FarmMap'), { ssr: false });
const DepartmentHeatMap = dynamic(() => import('../components/DepartmentHeatMap'), { ssr: false });

// DICCIONARIO COMPLETO DE TRADUCCIÓN REAL
const DICTIONARY: Record<'es' | 'en' | 'pt', Record<string, string>> = {
  es: {
    app_title: 'Monitor global de estrés térmico bovino',
    dairy_sub: 'Sistema lechero (DHLI · Lees et al., 2018)',
    beef_sub: 'Sistema cárnico (HLI · Gaughan et al., 2008)',
    dairy_btn: 'Bovinos de leche (DHLI)',
    beef_btn: 'Bovinos de carne (HLI)',
    manual_btn: 'Manual de usuario',
    search_placeholder: 'Buscar municipio, departamento o país (ej. Sopó, Montería, Rafaela)...',
    gps_btn: 'GPS',
    coords_btn: 'Coordenadas',
    sun_btn: 'A pleno sol',
    shade_btn: 'Con sombra (80%)',
    sat_btn: 'Satélite 2D',
    globe_btn: 'Globo 3D',
    roi_calc_btn: 'Calculadora ROI',
    breed_label_dairy: 'Raza lechera',
    breed_label_beef: 'Biotipo cárnico',
    yield_label_dairy: 'Producción diaria esperada',
    yield_label_beef: 'Manejo nutricional',
    index_dhli: 'ÍNDICE DHLI',
    index_hli: 'ÍNDICE HLI',
    over_threshold: 'Sobre el umbral',
    comfort: 'Zona de confort',
    registered_climate: 'CLIMA REGISTRADO',
    temp: 'Temperatura',
    humidity: 'Humedad',
    wind: 'Viento',
    radiation: 'Radiación',
    bgt: 'Globo negro (BGT)',
    estimated_impact: 'IMPACTO ESTIMADO',
    night_cooling: 'Enfriamiento nocturno',
    pred_title: 'Módulo predictivo y análisis multiescala',
    back_level: '← Nivel anterior',
    critical_threshold: 'UMBRAL CRÍTICO',
    play_sim: 'Reproducir simulación',
    pause: 'Pausar',
    sim_active: 'Simulación activa',
    news_admin: 'Administrar noticias',
    welcome_title: 'Selecciona el tipo de producción',
    welcome_sub: 'Configura los modelos bioclimáticos para tu predio.',
    model_dhli_desc: 'Modelo DHLI (Lees et al., 2018)',
    model_hli_desc: 'Modelo HLI (Gaughan et al., 2008)',
  },
  en: {
    app_title: 'Global Bovine Heat Stress Monitor',
    dairy_sub: 'Dairy System (DHLI · Lees et al., 2018)',
    beef_sub: 'Beef System (HLI · Gaughan et al., 2008)',
    dairy_btn: 'Dairy Cattle (DHLI)',
    beef_btn: 'Beef Cattle (HLI)',
    manual_btn: 'User Manual',
    search_placeholder: 'Search municipality, state or country...',
    gps_btn: 'GPS',
    coords_btn: 'Coordinates',
    sun_btn: 'Full Sun',
    shade_btn: 'With Shade (80%)',
    sat_btn: '2D Satellite',
    globe_btn: '3D Globe',
    roi_calc_btn: 'ROI Calculator',
    breed_label_dairy: 'Dairy Breed',
    breed_label_beef: 'Beef Biotype',
    yield_label_dairy: 'Expected Daily Yield',
    yield_label_beef: 'Nutritional Management',
    index_dhli: 'DHLI INDEX',
    index_hli: 'HLI INDEX',
    over_threshold: 'Above threshold',
    comfort: 'Comfort zone',
    registered_climate: 'RECORDED WEATHER',
    temp: 'Temperature',
    humidity: 'Humidity',
    wind: 'Wind',
    radiation: 'Radiation',
    bgt: 'Black Globe (BGT)',
    estimated_impact: 'ESTIMATED IMPACT',
    night_cooling: 'Night Cooling',
    pred_title: 'Predictive Module & Multiscale Analysis',
    back_level: '← Previous level',
    critical_threshold: 'CRITICAL THRESHOLD',
    play_sim: 'Play simulation',
    pause: 'Pause',
    sim_active: 'Active simulation',
    news_admin: 'Manage News',
    welcome_title: 'Select Production System',
    welcome_sub: 'Configure bioclimatic models for your herd.',
    model_dhli_desc: 'DHLI Model (Lees et al., 2018)',
    model_hli_desc: 'HLI Model (Gaughan et al., 2008)',
  },
  pt: {
    app_title: 'Monitor Global de Estresse Térmico Bovino',
    dairy_sub: 'Sistema Leiteiro (DHLI · Lees et al., 2018)',
    beef_sub: 'Sistema de Corte (HLI · Gaughan et al., 2008)',
    dairy_btn: 'Bovinos de Leite (DHLI)',
    beef_btn: 'Bovinos de Corte (HLI)',
    manual_btn: 'Manual do Usuário',
    search_placeholder: 'Buscar município, estado ou país...',
    gps_btn: 'GPS',
    coords_btn: 'Coordenadas',
    sun_btn: 'A Pleno Sol',
    shade_btn: 'Com Sombra (80%)',
    sat_btn: 'Satélite 2D',
    globe_btn: 'Globo 3D',
    roi_calc_btn: 'Calculadora ROI',
    breed_label_dairy: 'Raça Leiteira',
    breed_label_beef: 'Biótipo de Corte',
    yield_label_dairy: 'Produção Diária Esperada',
    yield_label_beef: 'Manejo Nutricional',
    index_dhli: 'ÍNDICE DHLI',
    index_hli: 'ÍNDICE HLI',
    over_threshold: 'Acima do limiar',
    comfort: 'Zona de conforto',
    registered_climate: 'CLIMA REGISTRADO',
    temp: 'Temperatura',
    humidity: 'Umidade',
    wind: 'Vento',
    radiation: 'Radiação',
    bgt: 'Globo Negro (BGT)',
    estimated_impact: 'IMPACTO ESTIMADO',
    night_cooling: 'Resfriamento Noturno',
    pred_title: 'Módulo Preditivo e Análise Multiescala',
    back_level: '← Nível anterior',
    critical_threshold: 'LIMIAR CRÍTICO',
    play_sim: 'Reproduzir simulação',
    pause: 'Pausar',
    sim_active: 'Simulação ativa',
    news_admin: 'Gerenciar Notícias',
    welcome_title: 'Selecione o Tipo de Produção',
    welcome_sub: 'Configure os modelos bioclimáticos para seu rebanho.',
    model_dhli_desc: 'Modelo DHLI (Lees et al., 2018)',
    model_hli_desc: 'Modelo HLI (Gaughan et al., 2008)',
  }
};

export default function HomePage() {
  const [lang, setLang] = useState<'es' | 'en' | 'pt'>('es');
  const [livestockMode, setLivestockMode] = useState<LivestockMode>('dairy');

  const t = (key: string) => DICTIONARY[lang]?.[key] || key;

  // Modal de bienvenida al ingresar
  const [showWelcomeSplash, setShowWelcomeSplash] = useState(false);

  // Por defecto: Sin punto fijado y modo Globo 3D
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [placeName, setPlaceName] = useState<string>('Selecciona un punto en el globo o busca un municipio');
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

  // Vistas (POR DEFECTO EN GLOBO 3D)
  const [showCoordsPanel, setShowCoordsPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mapMode, setMapMode] = useState<'globe' | 'satellite'>('globe');

  // Módulo Predictivo Multiescala (Inicia en 24 Horas)
  const [drillLevel, setDrillLevel] = useState<'hour' | 'day' | 'month' | 'year'>('hour');
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [selectedHour, setSelectedHour] = useState<number>(14);

  // Variables Climáticas
  const [temp, setTemp] = useState(31);
  const [rh, setRh] = useState(68);
  const [ws, setWs] = useState(2.4);
  const [sr, setSr] = useState(820);

  // Noticias Protegidas (CLAVE: 987651234)
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

  // Carga del visor 3D de Google
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
        console.error(err);
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

  // CLAVE EXACTA: 987651234
  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === '987651234') {
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

  // 1. HORAS (24h)
  const getHoursList = () => {
    return Array.from({ length: 24 }, (_, i) => {
      const peak = i >= 11 && i <= 16 ? (i === 13 || i === 14 ? 8 : 6) : i < 6 ? -5 : 0;
      return {
        label: `${i < 10 ? '0' : ''}${i}:00`,
        val: Math.round(result.indexVal + peak),
        temp: +(temp + peak * 0.5).toFixed(1),
        raw: i
      };
    });
  };

  // 2. DÍAS (1 al 31)
  const getDaysList = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => ({
      label: `${i + 1}`,
      val: Math.round(result.indexVal + Math.cos(i / 2.5) * 3),
      temp: +(temp + Math.cos(i / 2.5) * 1.5).toFixed(1),
      raw: i + 1
    }));
  };

  // 3. MESES (Ene a Dic)
  const getMonthsList = () => {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return meses.map((m, idx) => ({
      label: m,
      val: Math.round(result.indexVal + Math.sin((idx - 2) / 2) * 4),
      temp: +(temp + Math.sin((idx - 2) / 2) * 2.2).toFixed(1),
      raw: idx
    }));
  };

  // 4. AÑOS: TODOS LOS AÑOS CONSECUTIVOS DE 1980 A 2100 (121 AÑOS)
  const getYearsList = () => {
    return Array.from({ length: 121 }, (_, i) => {
      const y = 1980 + i;
      return {
        label: y.toString(),
        val: Math.round(result.indexVal - 5 + ((y - 2024) * 0.12)),
        temp: +(temp + ((y - 2024) * 0.025)).toFixed(1),
        raw: y,
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

  // COLOR DEL GRÁFICO (VERDE NEÓN EN LECHE, CÁLIDO EN CARNE)
  const chartLineColor = livestockMode === 'dairy' ? '#4ADE80' : '#F59E0B';

  return (
    <main className="min-h-screen bg-[#060A08] text-slate-100 font-sans selection:bg-emerald-500 selection:text-black">
      
      {/* PANTALLA INICIAL DE SELECCIÓN CON TRADUCCIÓN */}
      {showWelcomeSplash && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#0C1410] rounded-3xl border border-emerald-500/30 shadow-2xl max-w-xl w-full p-8 text-center space-y-6">
            
            <div className="flex justify-center items-center gap-2">
              <Languages className="w-4 h-4 text-emerald-400" />
              <div className="flex bg-black/60 p-1 rounded-xl text-xs font-semibold border border-white/10">
                {(['es', 'en', 'pt'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-3 py-1 rounded-lg transition uppercase ${lang === l ? 'bg-emerald-500 text-black font-bold shadow-md' : 'text-slate-400 hover:text-white'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">Plataforma zootécnica de precisión</span>
              <h2 className="text-2xl font-black text-white mt-1">{t('welcome_title')}</h2>
              <p className="text-xs text-slate-400 mt-1">{t('welcome_sub')}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => { setLivestockMode('dairy'); setUnitPrice(2200); setShowWelcomeSplash(false); }}
                className="p-5 rounded-2xl border-2 border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition text-left space-y-2 group"
              >
                <span className="text-3xl block group-hover:scale-110 transition">🥛</span>
                <div className="font-bold text-white text-sm">{t('dairy_btn')}</div>
                <div className="text-[11px] text-emerald-400 font-medium leading-tight">{t('model_dhli_desc')}</div>
              </button>

              <button
                onClick={() => { setLivestockMode('beef'); setUnitPrice(8500); setShowWelcomeSplash(false); }}
                className="p-5 rounded-2xl border-2 border-rose-500/40 hover:border-rose-400 bg-rose-950/20 hover:bg-rose-950/40 transition text-left space-y-2 group"
              >
                <span className="text-3xl block group-hover:scale-110 transition">🥩</span>
                <div className="font-bold text-white text-sm">{t('beef_btn')}</div>
                <div className="text-[11px] text-rose-400 font-medium leading-tight">{t('model_hli_desc')}</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CABECERA PRINCIPAL: TÍTULO MÁS GRANDE + IDIOMA */}
      <header className="sticky top-0 z-40 bg-[#060A08]/90 backdrop-blur-xl border-b border-white/10 px-4 md:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
          
          <div className="flex items-center gap-3">
            <span className="text-3xl">{livestockMode === 'dairy' ? '🥛' : '🥩'}</span>
            <div>
              <h1 className="font-black text-xl md:text-2xl tracking-tight text-white block">
                {t('app_title')}
              </h1>
              <span className={`text-xs font-semibold ${livestockMode === 'dairy' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {livestockMode === 'dairy' ? t('dairy_sub') : t('beef_sub')}
              </span>
            </div>
          </div>

          <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/10">
            <button
              onClick={() => { setLivestockMode('dairy'); setUnitPrice(2200); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                livestockMode === 'dairy'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Milk className="w-4 h-4" /> {t('dairy_btn')}
            </button>
            <button
              onClick={() => { setLivestockMode('beef'); setUnitPrice(8500); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                livestockMode === 'beef'
                  ? 'bg-rose-600 text-white font-black shadow-lg shadow-rose-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Beef className="w-4 h-4" /> {t('beef_btn')}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-black/60 p-1 rounded-xl text-xs font-bold border border-white/10">
              {(['es', 'en', 'pt'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1 rounded-lg transition uppercase ${lang === l ? 'bg-emerald-500 text-black' : 'text-slate-400 hover:text-white'}`}
                >
                  {l}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowManualModal(true)}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-white/10"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-400" /> {t('manual_btn')}
            </button>
          </div>

        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">

        {/* HERO: CARRUSEL CON ANIMAL 3D MÁS GRANDE (h-56) Y COLOR REACTIVO */}
        <div className="relative rounded-3xl border border-white/10 p-6 md:p-8 bg-gradient-to-r from-emerald-950/20 via-[#0A120E] to-black shadow-2xl overflow-hidden">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {newsList[activeNewsIdx]?.category || 'Novedad'}
              </span>
              <span className="text-[11px] text-slate-400">{newsList[activeNewsIdx]?.date}</span>
            </div>

            <button
              onClick={() => setShowNewsAdminModal(true)}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-semibold border border-white/10 flex items-center gap-1.5"
            >
              <Lock className="w-3 h-3 text-slate-400" /> {t('news_admin')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            <div className="md:col-span-5 space-y-2">
              <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
                {newsList[activeNewsIdx]?.title}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
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

            <div className="md:col-span-3 h-40 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
              <img
                src={newsList[activeNewsIdx]?.imageUrl}
                alt="Noticia"
                className="w-full h-full object-cover"
              />
            </div>

            <div
              className="md:col-span-4 h-56 flex items-center justify-center relative cursor-grab active:cursor-grabbing transition-all duration-700"
              style={{
                filter: `drop-shadow(0 0 25px ${result.color}88)`,
              }}
            >
              {React.createElement('model-viewer', {
                src: livestockMode === 'dairy' ? '/models/cow-dairy.glb' : '/models/bull-beef.glb',
                'camera-controls': true,
                'auto-rotate': true,
                'shadow-intensity': '1',
                'rotation-per-second': '28deg',
                style: { width: '100%', height: '100%', background: 'transparent', outline: 'none' }
              })}
            </div>

          </div>
        </div>

        {/* DIVISIÓN EN 2 COLUMNAS (IMAGEN 1):
            IZQUIERDA: GLOBO / MAPA 3D
            DERECHA: PANEL DE CONTROL Y MÉTRICAS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMNA IZQUIERDA (7 COLS): GLOBO 3D */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative rounded-3xl overflow-hidden border border-emerald-500/20 bg-[#080E0C] shadow-2xl h-[520px]">
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
          </div>

          {/* COLUMNA DERECHA (5 COLS): CONTROLES Y MÉTRICAS AGRUPADAS */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Buscador */}
            <div className="relative">
              <input
                type="text"
                placeholder={t('search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#0D1512] border border-emerald-500/30 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-emerald-400" />
              {isSearching && (
                <span className="absolute right-3.5 top-3.5 text-[10px] text-emerald-400 animate-pulse">...</span>
              )}

              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-[#0C1410] border border-emerald-500/30 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-white/5 max-h-56 overflow-y-auto">
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectPlace(item)}
                      className="w-full text-left px-4 py-2.5 hover:bg-emerald-500/10 text-xs text-slate-300 flex items-center gap-2"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{item.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Botones de Función */}
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={handleGPS}
                className="py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold rounded-xl text-xs border border-emerald-500/40 flex items-center justify-center gap-1 transition"
              >
                <MapPin className="w-3.5 h-3.5" /> {t('gps_btn')}
              </button>
              <button
                onClick={() => setShowCoordsPanel(!showCoordsPanel)}
                className="py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold rounded-xl text-xs border border-white/10 flex items-center justify-center gap-1"
              >
                <Navigation className="w-3.5 h-3.5" /> {t('coords_btn')}
              </button>
              <button
                onClick={() => setHasShade(!hasShade)}
                className={`py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1 ${
                  hasShade ? 'bg-teal-600/30 border-teal-500 text-teal-300' : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                }`}
              >
                {hasShade ? <Trees className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                {hasShade ? t('shade_btn') : t('sun_btn')}
              </button>
              <button
                onClick={() => setMapMode(mapMode === 'globe' ? 'satellite' : 'globe')}
                className="py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-bold rounded-xl text-xs border border-blue-500/40 flex items-center justify-center gap-1"
              >
                {mapMode === 'globe' ? <MapIcon className="w-3.5 h-3.5" /> : <Globe2 className="w-3.5 h-3.5" />}
                {mapMode === 'globe' ? t('sat_btn') : t('globe_btn')}
              </button>
            </div>

            {/* Botón Calculadora ROI */}
            <button
              onClick={() => setShowFinanceModal(true)}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500/20 to-emerald-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 text-white font-bold rounded-xl text-xs border border-amber-500/30 flex items-center justify-center gap-2 shadow-lg"
            >
              <DollarSign className="w-4 h-4 text-amber-400" /> {t('roi_calc_btn')}
            </button>

            {showCoordsPanel && (
              <form onSubmit={handleManualCoordsSubmit} className="p-3 bg-[#0D1512] rounded-2xl border border-white/10 flex gap-2">
                <input
                  type="number"
                  step="any"
                  placeholder="Lat"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className="w-1/2 px-2.5 py-1.5 bg-black/60 border border-white/10 rounded-lg text-xs"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Lon"
                  value={manualLon}
                  onChange={(e) => setManualLon(e.target.value)}
                  className="w-1/2 px-2.5 py-1.5 bg-black/60 border border-white/10 rounded-lg text-xs"
                />
                <button type="submit" className="px-3 py-1.5 bg-emerald-500 text-black font-bold rounded-lg text-xs">
                  Ir
                </button>
              </form>
            )}

            {/* Selectores de Raza y Producción */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                  {livestockMode === 'dairy' ? t('breed_label_dairy') : t('breed_label_beef')}
                </label>
                {livestockMode === 'dairy' ? (
                  <select
                    value={dairyBreed}
                    onChange={(e) => setDairyBreed(e.target.value as DairyBreedType)}
                    className="w-full bg-[#0D1512] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="holstein">Holstein / Frisón</option>
                    <option value="jersey">Jersey</option>
                    <option value="girolando">Girolando</option>
                    <option value="cross">Doble propósito</option>
                  </select>
                ) : (
                  <select
                    value={beefBreed}
                    onChange={(e) => setBeefBreed(e.target.value as BeefBreedType)}
                    className="w-full bg-[#0D1512] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="angus">Británicas (Angus)</option>
                    <option value="brangus">Sintéticas (Brangus)</option>
                    <option value="brahman">Cebuinas (Brahman)</option>
                  </select>
                )}
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                  {livestockMode === 'dairy' ? t('yield_label_dairy') : t('yield_label_beef')}
                </label>
                {livestockMode === 'dairy' ? (
                  <select
                    value={yieldLevel}
                    onChange={(e) => setYieldLevel(e.target.value as YieldLevel)}
                    className="w-full bg-[#0D1512] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="high">Alta (&gt; 35 L)</option>
                    <option value="medium">Media (20-30 L)</option>
                    <option value="low">Baja (&lt; 15 L)</option>
                  </select>
                ) : (
                  <select className="w-full bg-[#0D1512] border border-white/10 rounded-xl px-3 py-2 text-xs text-white">
                    <option>Pastoreo intensivo</option>
                    <option>Confinamiento (Feedlot)</option>
                    <option>Levante y cría</option>
                  </select>
                )}
              </div>
            </div>

            {/* Gran Tarjeta de Índice */}
            <div className="p-5 rounded-3xl border border-emerald-500/30 bg-[#0C1511] shadow-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">
                  {livestockMode === 'dairy' ? t('index_dhli') : t('index_hli')}
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-5xl font-black font-mono text-white" style={{ color: result.color }}>
                    {selectedCoords ? result.indexVal : '--'}
                  </span>
                  <span className="text-xs text-slate-400">/ 100</span>
                </div>
              </div>

              <div
                className="px-3 py-1.5 rounded-full text-xs font-bold border"
                style={{
                  backgroundColor: `${result.color}20`,
                  borderColor: `${result.color}60`,
                  color: result.color,
                }}
              >
                {selectedCoords 
                  ? (result.indexVal > thresholdLineValue ? `${t('over_threshold')} (${thresholdLineValue})` : t('comfort'))
                  : 'Listo para analizar'}
              </div>
            </div>

            {/* Cuadrícula de Clima de 2x2 */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-[#0D1512] rounded-2xl border border-white/5 space-y-0.5">
                <span className="text-[10px] text-slate-400 block">{t('temp')}</span>
                <span className="text-lg font-bold font-mono text-white">{selectedCoords ? `${temp} °C` : '--'}</span>
              </div>
              <div className="p-3 bg-[#0D1512] rounded-2xl border border-white/5 space-y-0.5">
                <span className="text-[10px] text-slate-400 block">{t('humidity')}</span>
                <span className="text-lg font-bold font-mono text-white">{selectedCoords ? `${rh} %` : '--'}</span>
              </div>
              <div className="p-3 bg-[#0D1512] rounded-2xl border border-white/5 space-y-0.5">
                <span className="text-[10px] text-slate-400 block">{t('wind')}</span>
                <span className="text-lg font-bold font-mono text-white">{selectedCoords ? `${ws} m/s` : '--'}</span>
              </div>
              <div className="p-3 bg-[#0D1512] rounded-2xl border border-white/5 space-y-0.5">
                <span className="text-[10px] text-slate-400 block">{t('radiation')}</span>
                <span className="text-lg font-bold font-mono text-white">{selectedCoords ? (hasShade ? `${(sr * 0.2).toFixed(0)} W/m²` : `${sr} W/m²`) : '--'}</span>
              </div>
              <div className="p-3 bg-[#0D1512] rounded-2xl border border-white/5 space-y-0.5">
                <span className="text-[10px] text-slate-400 block">{t('bgt')}</span>
                <span className="text-base font-bold font-mono text-amber-400">{selectedCoords ? `${result.bgt} °C` : '--'}</span>
              </div>
              <div className="p-3 bg-[#0D1512] rounded-2xl border border-white/5 space-y-0.5">
                <span className="text-[10px] text-slate-400 block">{t('estimated_impact')}</span>
                <span className="text-base font-bold font-mono text-red-400">
                  {livestockMode === 'dairy'
                    ? (selectedCoords ? `-${(result as any).milkLoss} L/vaca` : '--')
                    : (selectedCoords ? `-${(result as any).adgLoss} kg/día` : '--')}
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* MÓDULO PREDICTIVO MULTIESCALA: CON TODOS LOS AÑOS DE 1980 A 2100 */}
        <div className="bg-[#0A110D] p-6 rounded-3xl border border-emerald-500/20 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <h3 className="font-bold text-sm text-white">{t('pred_title')}</h3>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono mt-0.5">
                <button onClick={() => setDrillLevel('year')} className={drillLevel === 'year' ? 'font-bold text-white underline' : 'hover:text-white'}>
                  Años
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <button onClick={() => setDrillLevel('month')} className={drillLevel === 'month' ? 'font-bold text-white underline' : 'hover:text-white'}>
                  Meses ({selectedYear})
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <button onClick={() => setDrillLevel('day')} className={drillLevel === 'day' ? 'font-bold text-white underline' : 'hover:text-white'}>
                  Días ({mesesNombres[selectedMonth]})
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <button onClick={() => setDrillLevel('hour')} className={drillLevel === 'hour' ? 'font-bold text-white underline' : 'hover:text-white'}>
                  Horas (Día {selectedDay})
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* SELECTOR CON TODOS LOS AÑOS DE 1980 A 2100 (121 AÑOS) */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-white font-mono"
              >
                {Array.from({ length: 121 }, (_, i) => 1980 + i).map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-white font-mono"
              >
                {mesesNombres.map((m, idx) => (
                  <option key={idx} value={idx}>{m.slice(0, 3)}</option>
                ))}
              </select>

              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(Number(e.target.value))}
                className="bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-white font-mono"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {drillLevel !== 'year' && (
                <button
                  onClick={() => {
                    if (drillLevel === 'hour') setDrillLevel('day');
                    else if (drillLevel === 'day') setDrillLevel('month');
                    else if (drillLevel === 'month') setDrillLevel('year');
                  }}
                  className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-xs font-bold border border-emerald-500/40"
                >
                  {t('back_level')}
                </button>
              )}
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getChartData()} onClick={handleChartPointClick} className="cursor-pointer">
                <CartesianGrid strokeDasharray="3 3" stroke="#16251E" />
                <XAxis 
                  dataKey="label" 
                  stroke="#4ADE80" 
                  fontSize={11} 
                  interval={drillLevel === 'year' ? 9 : 0} 
                />
                <YAxis domain={[0, livestockMode === 'dairy' ? 70 : 120]} stroke="#4ADE80" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#09110D', borderColor: '#22C55E', borderRadius: '12px', fontSize: '12px', color: '#FFFFFF' }}
                  formatter={(value: any) => [`${value} (${livestockMode === 'dairy' ? 'DHLI' : 'HLI'})`, 'Estrés']}
                />
                <ReferenceLine
                  y={thresholdLineValue}
                  stroke="#EF4444"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{ value: `${t('critical_threshold')} · ${thresholdLineValue}`, fill: '#EF4444', fontSize: 10, position: 'right' }}
                />
                <Line
                  type="monotone"
                  dataKey="val"
                  stroke={chartLineColor}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 7, stroke: '#FFFFFF', strokeWidth: 2, fill: chartLineColor }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MAPA CIENTÍFICO ROBINSON CON CALOR EXCLUSIVAMENTE SOBRE LA TIERRA */}
        <DepartmentHeatMap
          lat={lat}
          lon={lon}
          placeName={placeName}
          livestockMode={livestockMode}
          t={t}
        />

      </div>

      {/* BOTÓN FLOTANTE DE WHATSAPP */}
      <button
        onClick={handleSendWhatsAppAlert}
        className="fixed bottom-24 right-6 z-40 w-12 h-12 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 shadow-emerald-500/30"
        title="WhatsApp"
      >
        <MessageCircle className="w-5 h-5" />
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

      {/* MODAL DE NOTICIAS CON CLAVE: 987651234 */}
      {showNewsAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0C1410] rounded-3xl max-w-md w-full p-6 space-y-4 border border-emerald-500/30 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-400" /> Acceso de Administrador
              </h3>
              <button onClick={() => { setShowNewsAdminModal(false); setIsAuthenticated(false); }} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {!isAuthenticated ? (
              <form onSubmit={handleVerifyPin} className="space-y-3 text-xs">
                <p className="text-slate-400">Ingresa la clave de administrador para gestionar noticias:</p>
                <input
                  type="password"
                  placeholder="Clave de seguridad"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  className="w-full bg-black/60 border border-emerald-500/40 rounded-xl px-3 py-2 text-center text-base tracking-widest text-white"
                />
                {pinError && <p className="text-red-400 text-[11px] font-semibold">Clave incorrecta.</p>}
                <button type="submit" className="w-full py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl shadow-lg">
                  Acceder
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <form onSubmit={handleAddNewsItem} className="space-y-2.5 text-xs">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-0.5">Título del anuncio:</label>
                    <input
                      type="text"
                      placeholder="Ej. Taller silvopastoril"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-0.5">Categoría:</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-lg px-2 py-1.5 text-white"
                      >
                        <option value="Noticia">Noticia</option>
                        <option value="Investigación">Investigación</option>
                        <option value="Evento">Evento ganadero</option>
                        <option value="Manejo">Manejo en potrero</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-0.5">Foto:</label>
                      <input
                        type="file"
                        accept="image/*"
                        ref={newsImageInputRef}
                        onChange={handleImageFileChange}
                        className="w-full text-slate-400 text-[11px] file:mr-1 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-emerald-500 file:text-black font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-0.5">Resumen:</label>
                    <textarea
                      rows={2}
                      placeholder="Texto del anuncio..."
                      value={newSummary}
                      onChange={(e) => setNewSummary(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <button type="submit" className="w-full py-2 bg-emerald-500 text-black font-bold rounded-xl shadow-lg">
                    Publicar noticia
                  </button>
                </form>

                <div className="pt-2 border-t border-white/10 max-h-36 overflow-y-auto space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 block">Noticias actuales:</span>
                  {newsList.map((item) => (
                    <div key={item.id} className="p-2 bg-black/40 rounded-lg border border-white/5 flex justify-between items-center gap-2">
                      <span className="font-semibold text-slate-200 text-xs truncate">{item.title}</span>
                      <button onClick={() => handleDeleteNewsItem(item.id)} className="p-1 text-red-400 hover:bg-red-950/40 rounded-md">
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0C1410] rounded-3xl max-w-xl w-full p-6 space-y-4 border border-emerald-500/30 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-400" /> {t('manual_btn')}
              </h3>
              <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p><strong>1. Búsqueda y geolocalización:</strong> Puedes escribir el municipio en la barra de búsqueda superior, activar tu sensor GPS o ingresar coordenadas manuales.</p>
              <p><strong>2. Interpretación de los índices:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Leche (DHLI):</strong> Umbral en 25. Por encima de 25 inicia la caída en litros y la alteración de sólidos lácteos.</li>
                <li><strong>Carne (HLI):</strong> Umbral en 77. Valores superiores causan disminución en el consumo voluntario de materia seca y ganancia de peso diaria.</li>
              </ul>
              <p><strong>3. Mitigación con sombra:</strong> El botón de sombra simula la intercepción del 80% de radiación directa (árboles en silvopastoreo o polisombra), amortiguando la temperatura de globo negro (BGT).</p>
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <a
                href="/manual-estres-termico.pdf"
                download="Manual_Usuario_Estres_Termico.pdf"
                className="px-4 py-2 bg-emerald-500 text-black font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg"
              >
                <Download className="w-3.5 h-3.5" /> Descargar manual en PDF
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE LA CALCULADORA FINANCIERA */}
      {showFinanceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0C1410] rounded-3xl max-w-xl w-full p-6 space-y-4 border border-amber-500/30 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-amber-400" /> {t('roi_calc_btn')}
              </h3>
              <button onClick={() => setShowFinanceModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-0.5">Animales en lote:</label>
                <input type="number" min="1" value={animalCount} onChange={(e) => setAnimalCount(Number(e.target.value))} className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-bold" />
              </div>
              <div>
                <label className="text-slate-400 block mb-0.5">Precio unitario ($):</label>
                <input type="number" min="0" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-bold" />
              </div>
              <div>
                <label className="text-slate-400 block mb-0.5">Moneda:</label>
                <select value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-semibold">
                  <option value="COP ($)">COP ($)</option>
                  <option value="USD ($)">USD ($)</option>
                  <option value="BRL (R$)">BRL (R$)</option>
                  <option value="EUR (€)">EUR (€)</option>
                  <option value="MXN ($)">MXN ($)</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-0.5">Inversión en sombra:</label>
                <input type="number" min="0" value={mitigationCost} onChange={(e) => setMitigationCost(Number(e.target.value))} className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 text-center">
              <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">Pérdida diaria</span>
                <span className="text-base font-bold text-amber-400 font-mono">${dailyMoneyLost.toLocaleString()}</span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">Pérdida mensual</span>
                <span className="text-base font-bold text-red-400 font-mono">${monthlyMoneyLost.toLocaleString()}</span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">Retorno (ROI)</span>
                <span className="text-base font-bold text-emerald-400 font-mono">{roiMonths} meses</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER CON SELECTOR DE IDIOMA AL FINAL Y ENLACES ORCID */}
      <footer className="border-t border-white/10 mt-12 pt-6 pb-12 bg-black text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <span className="text-sm font-bold text-white block">{t('app_title')}</span>
              <span className="text-[11px] text-slate-500">Modelación bioclimática zootécnica de precisión</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-semibold">Idioma / Language:</span>
              <div className="flex bg-white/5 p-1 rounded-xl text-xs font-bold border border-white/10">
                {(['es', 'en', 'pt'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-3 py-1 rounded-lg transition uppercase ${lang === l ? 'bg-emerald-500 text-black' : 'text-slate-400 hover:text-white'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-3">
            <a href="https://orcid.org/0000-0001-7064-6753" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2">
              <div>
                <div className="font-semibold text-slate-200 text-xs">William Armando Tapie Canacuan</div>
                <div className="text-[10px] text-slate-500">ORCID: 0000-0001-7064-6753</div>
              </div>
            </a>

            <a href="https://orcid.org/0001-6651-3819" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2">
              <div>
                <div className="font-semibold text-slate-200 text-xs">Carlos Eduardo Giraldo Sanchez</div>
                <div className="text-[10px] text-slate-500">ORCID: 0001-6651-3819</div>
              </div>
            </a>

            <a href="https://orcid.org/0009-0002-0122-8667" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2">
              <div>
                <div className="font-semibold text-slate-200 text-xs">Juan Fernando Manrique Hincapie</div>
                <div className="text-[10px] text-slate-500">ORCID: 0009-0002-0122-8667</div>
              </div>
            </a>
          </div>
        </div>
      </footer>

    </main>
  );
}