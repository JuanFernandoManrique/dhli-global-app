'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getWeatherData, reverseGeocode } from '../lib/weather-api';
import { estimateBGT, calculateDHLI, calculateHLI_Beef, LivestockMode, DairyBreedType, BeefBreedType, YieldLevel } from '../lib/dhli-calculator';
import { translations, Language } from '../lib/i18n';
import AiChatbot from '../components/AiChatbot';
import { Search, MapPin, Sliders, Thermometer, Wind, Droplets, Sun, Calendar, Clock, TrendingUp, Globe2, Map as MapIcon, ChevronRight, RotateCcw, Navigation, Languages, Trees, Download, Printer, Moon, DollarSign, MessageCircle, Settings, Beef, Milk } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, LineChart, Line } from 'recharts';

const EarthGlobe = dynamic(() => import('../components/EarthGlobe'), { ssr: false });
const FarmMap = dynamic(() => import('../components/FarmMap'), { ssr: false });

export default function HomePage() {
  const [lang, setLang] = useState<Language>('es');
  const t = translations[lang];

  // Modo: Leche (DHLI) o Carne (HLI)
  const [livestockMode, setLivestockMode] = useState<LivestockMode>('dairy');

  // Ubicación
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [placeName, setPlaceName] = useState<string>('Selecciona un punto en el globo terráqueo o busca un municipio');
  const [lat, setLat] = useState<number>(4.57);
  const [lon, setLon] = useState<number>(-74.29);
  const [manualLat, setManualLat] = useState<string>('');
  const [manualLon, setManualLon] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Configuración de Hato y Manejo
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
  const [timeTab, setTimeTab] = useState<'24h' | '7d' | 'futuro'>('futuro');

  // Series temporales
  const [maxYearLimit, setMaxYearLimit] = useState<number>(2100);
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

  // BGT oficial (Dimiceli & Piltz, 2011)
  const currentBGT = estimateBGT(temp, rh, ws, sr, hasShade);

  // Cálculo zootécnico oficial
  const result = livestockMode === 'dairy'
    ? calculateDHLI(currentBGT, rh, lang, dairyBreed, yieldLevel)
    : calculateHLI_Beef(currentBGT, rh, ws, lang, beefBreed);

  // Cuantificación económica
  const dailyPhysicalLost = livestockMode === 'dairy'
    ? (result as any).milkLoss * animalCount
    : (result as any).adgLoss * animalCount;

  const dailyMoneyLost = dailyPhysicalLost * unitPrice;
  const monthlyMoneyLost = dailyMoneyLost * 30;
  const roiMonths = dailyMoneyLost > 0 ? (mitigationCost / monthlyMoneyLost).toFixed(1) : 'N/A';

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
        maxYearLimit,
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
      const nowYear = new Date().getFullYear();
      const currentYearObj = data.yearsData.find((y: any) => y.year === nowYear) || data.yearsData[0];
      setSelectedYear(currentYearObj);
      
      const nowMonthIdx = new Date().getMonth();
      if (currentYearObj && currentYearObj.months) {
        setSelectedMonth(currentYearObj.months[nowMonthIdx]);
      }

    } catch (e) {
      console.error('Error al actualizar datos meteorológicos:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCoords) {
      handleLocationUpdate(selectedCoords.lat, selectedCoords.lng, placeName);
    }
  }, [livestockMode, hasShade, dairyBreed, beefBreed, yieldLevel, scenario, maxYearLimit, lang]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 2) {
        try {
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery)}`);
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data || []);
          }
        } catch {
          setSearchResults([]);
        }
      } else {
        setSearchResults([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectPlace = (item: any) => {
    const newLat = parseFloat(item.lat);
    const newLon = parseFloat(item.lon);
    const name = item.display_name.split(',').slice(0, 3).join(', ');
    setSearchQuery('');
    handleLocationUpdate(newLat, newLon, name);
  };

  const handleManualCoordsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedLat = parseFloat(manualLat);
    const parsedLon = parseFloat(manualLon);
    if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
      handleLocationUpdate(parsedLat, parsedLon);
      setShowCoordsPanel(false);
    }
  };

  const handleGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        handleLocationUpdate(pos.coords.latitude, pos.coords.longitude);
      });
    }
  };

  const handleSendWhatsAppAlert = () => {
    const dateStr = new Date().toLocaleDateString('es-CO');
    const indexName = livestockMode === 'dairy' ? 'DHLI' : 'HLI';
    const impactText = livestockMode === 'dairy'
      ? `📉 *Pérdida esperada:* -${(result as any).milkLoss} L/vaca/día (${dailyPhysicalLost.toFixed(0)} L/día en el hato)`
      : `📉 *Caída en Ganancia:* -${(result as any).adgLoss} kg/día/novillo (-${(result as any).dmiDrop}% consumo MS)`;

    const msg = `🚨 *ALERTA DIARIA DE ESTRÉS TÉRMICO BOVINO (${indexName})*\n` +
      `📍 *Ubicación:* ${placeName}\n` +
      `🐄 *Propósito:* ${livestockMode === 'dairy' ? `Leche (${dairyBreed.toUpperCase()})` : `Carne (${beefBreed.toUpperCase()})`}\n` +
      `📅 *Fecha:* ${dateStr}\n` +
      `🌡️ *${indexName} Actual:* ${result.indexVal} (${result.category})\n` +
      `☀️ *Temp:* ${temp}°C | *Globo Negro:* ${result.bgt}°C | *Humedad:* ${rh}%\n` +
      `${impactText}\n` +
      `💰 *Pérdida financiera diaria:* $${dailyMoneyLost.toLocaleString()} ${currencySymbol}\n` +
      `🧬 *Diagnóstico:* ${result.meaning}\n\n` +
      `🔗 *Consulta el monitor completo en:* https://dhli-global.org`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleExportCSV = () => {
    if (hourlyData.length === 0) return;
    const indexName = livestockMode === 'dairy' ? 'DHLI' : 'HLI';
    let csvContent = `data:text/csv;charset=utf-8,Hora,Temperatura_C,BGT_C,${indexName}\n`;
    hourlyData.forEach((row) => {
      csvContent += `${row.label},${row.Temp},${row.BGT.toFixed(1)},${row.DHLI}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${indexName}_Datos_${placeName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans relative">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Barra Superior con Selector Dual LECHE / CARNE */}
        <div className="flex flex-wrap justify-between items-center gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{livestockMode === 'dairy' ? '🥛' : '🥩'}</span>
            <div>
              <span className="font-black text-sm tracking-wider text-emerald-400">BOVINE HEAT STRESS DSS</span>
              <span className="text-[10px] text-slate-400 block">{livestockMode === 'dairy' ? 'Modelo Lechero DHLI (Lees et al. 2018)' : 'Modelo Cárnico HLI (Gaughan et al. 2008)'}</span>
            </div>
          </div>

          <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 shadow-inner">
            <button
              onClick={() => { setLivestockMode('dairy'); setUnitPrice(2200); }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${livestockMode === 'dairy' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:text-white'}`}
            >
              <Milk className="w-4 h-4" /> {t.modeDairy}
            </button>
            <button
              onClick={() => { setLivestockMode('beef'); setUnitPrice(8500); }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${livestockMode === 'beef' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-slate-400 hover:text-white'}`}
            >
              <Beef className="w-4 h-4" /> {t.modeBeef}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleSendWhatsAppAlert} type="button" className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition">
              <MessageCircle className="w-3.5 h-3.5" /> {t.btnSendWhatsapp}
            </button>
            <button onClick={() => setShowFinanceModal(!showFinanceModal)} type="button" className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-amber-950 transition">
              <DollarSign className="w-3.5 h-3.5" /> {t.btnFinance}
            </button>
            <button onClick={handleExportCSV} type="button" className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-xs flex items-center gap-1.5 border border-slate-800 text-slate-300">
              <Download className="w-3.5 h-3.5 text-emerald-400" /> {t.btnExportCsv}
            </button>
            <button onClick={() => window.print()} type="button" className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-xs flex items-center gap-1.5 border border-slate-800 text-slate-300">
              <Printer className="w-3.5 h-3.5 text-blue-400" /> {t.btnPrintPdf}
            </button>

            <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800 text-xs">
              <Languages className="w-3.5 h-3.5 text-slate-400 mr-1" />
              <button onClick={() => setLang('es')} className={`px-2 py-0.5 rounded font-semibold ${lang === 'es' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>ES</button>
              <button onClick={() => setLang('en')} className={`px-2 py-0.5 rounded font-semibold ${lang === 'en' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>EN</button>
              <button onClick={() => setLang('pt')} className={`px-2 py-0.5 rounded font-semibold ${lang === 'pt' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>PT</button>
            </div>
          </div>
        </div>

        {/* Encabezado Principal en MAYÚSCULAS */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl md:text-4xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400 uppercase">
            {t.title}
          </h1>
          <p className="text-slate-400 text-xs md:text-sm">
            {t.subtitle}
          </p>
        </div>

        {/* Modal de Configuración del Hato */}
        {showHerdModal && (
          <div className="bg-slate-900 p-5 rounded-3xl border border-emerald-500/40 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-2xl">
            {livestockMode === 'dairy' ? (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">{t.breedLabel} (Leche)</label>
                  <select
                    value={dairyBreed}
                    onChange={(e) => setDairyBreed(e.target.value as DairyBreedType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="holstein">Holstein / Frisón (Umbral DHLI = 22–25 | k = 0,08–0,14)</option>
                    <option value="jersey">Jersey (Umbral DHLI = 32,0 | k = 0,06 - DairyNZ 2017)</option>
                    <option value="girolando">Girolando 1/2 y 3/4 (Umbral DHLI = 38,0 | k = 0,05 - Boonkum 2024)</option>
                    <option value="cross">Doble Propósito / Criollo (Umbral DHLI = 42,0 | k = 0,04 - Gantner 2017)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">{t.prodLabel}</label>
                  <select
                    value={yieldLevel}
                    onChange={(e) => setYieldLevel(e.target.value as YieldLevel)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="high">Alta producción (&gt; 35 kg/vaca/día - Mayor calor metabólico, Berman 2005)</option>
                    <option value="medium">Producción media (20 – 30 kg/vaca/día - Típica)</option>
                    <option value="low">Baja producción / Pastoreo (&lt; 15 kg/vaca/día)</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">{t.breedLabel} (Carne)</label>
                  <select
                    value={beefBreed}
                    onChange={(e) => setBeefBreed(e.target.value as BeefBreedType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="angus">Británicas / Continentales (Angus, Hereford - Umbral HLI 86 / Recup 77)</option>
                    <option value="brangus">Sintéticas (Brangus, Braford - Umbral HLI 89 / Recup 80)</option>
                    <option value="brahman">Cebuinas / Zebu (Brahman, Nelore - Umbral HLI 93 / Recup 84)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Sistema de Producción:</label>
                  <select className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500">
                    <option>Ceba en Pastoreo Intensivo</option>
                    <option>Engorde a Corral / Feedlot (Alta densidad)</option>
                    <option>Levante / Recría</option>
                  </select>
                </div>
              </>
            )}
          </div>
        )}

        {/* Modal Financiero y Retorno de Inversión (ROI) */}
        {showFinanceModal && (
          <div className="bg-slate-900 p-6 rounded-3xl border border-amber-500/40 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Calculadora de Pérdidas y ROI ({livestockMode === 'dairy' ? 'Modelo Lácteo' : 'Modelo de Carne'})</h3>
              </div>
              <span className="text-xs bg-amber-950 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-800 font-semibold">
                St-Pierre et al. (2003) / Mayer et al. (1999)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">{livestockMode === 'dairy' ? 'Vacas en ordeño:' : 'Novillos en lote:'}</label>
                <input type="number" min="1" value={animalCount} onChange={(e) => setAnimalCount(Math.max(1, Number(e.target.value)))} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">{livestockMode === 'dairy' ? 'Precio por litro de leche:' : 'Precio por kg de carne vivo:'}</label>
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
                <label className="text-slate-400 block mb-1">Costo de inversión (Mitigación):</label>
                <input type="number" min="0" value={mitigationCost} onChange={(e) => setMitigationCost(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Pérdida monetaria diaria:</span>
                <span className="text-2xl font-black text-amber-400">${dailyMoneyLost.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 block">
                  ({dailyPhysicalLost.toFixed(1)} {livestockMode === 'dairy' ? 'L/día en el hato' : 'kg en pie no ganados/día'})
                </span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Pérdida mensual proyectada:</span>
                <span className="text-2xl font-black text-red-400">${monthlyMoneyLost.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 block">Basado en 30 días acumulados</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Tiempo de retorno de inversión (ROI):</span>
                <span className="text-2xl font-black text-emerald-400">{roiMonths} meses</span>
                <span className="text-[10px] text-slate-500 block">Amortización por leche o carne que se deja de perder</span>
              </div>
            </div>
          </div>
        )}

        {/* Barra de Búsqueda y Botones de Control */}
        <div className="relative z-30">
          <div className="bg-slate-900/90 p-3 md:p-4 rounded-2xl border border-slate-800 flex flex-wrap gap-3 items-center justify-between shadow-xl">
            <div className="flex-1 min-w-[260px] relative">
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 text-sm"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={handleGPS} type="button" className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 transition rounded-xl text-xs md:text-sm flex items-center gap-1.5 font-semibold text-white">
                <MapPin className="w-4 h-4" /> {t.btnGps}
              </button>

              <button
                onClick={() => setShowCoordsPanel(!showCoordsPanel)}
                type="button"
                className={`px-3 py-2 transition rounded-xl text-xs md:text-sm flex items-center gap-1.5 font-semibold border ${showCoordsPanel ? 'bg-emerald-700 text-white border-emerald-500' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'}`}
              >
                <Navigation className="w-4 h-4" /> {t.btnCoords}
              </button>

              <button
                onClick={() => setHasShade(!hasShade)}
                type="button"
                className={`px-3 py-2 transition rounded-xl text-xs md:text-sm flex items-center gap-1.5 font-semibold border ${hasShade ? 'bg-teal-600 text-white border-teal-400 shadow-lg shadow-teal-950' : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500'}`}
              >
                {hasShade ? <Trees className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                {hasShade ? t.btnShadeTree : t.btnShadeSun}
              </button>

              <button
                onClick={() => setShowHerdModal(!showHerdModal)}
                type="button"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 transition rounded-xl text-xs md:text-sm flex items-center gap-1.5 border border-slate-700 text-slate-200"
              >
                <Settings className="w-4 h-4 text-emerald-400" /> {t.btnHerdConfig}
              </button>
              
              <button
                onClick={() => setMapMode(mapMode === 'globe' ? 'satellite' : 'globe')}
                type="button"
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 transition rounded-xl text-xs md:text-sm flex items-center gap-1.5 font-semibold text-white shadow-lg shadow-blue-900/40"
              >
                {mapMode === 'globe' ? <MapIcon className="w-4 h-4" /> : <Globe2 className="w-4 h-4" />}
                {mapMode === 'globe' ? t.btnSatellite : t.btnGlobe}
              </button>

              <button onClick={() => setManualMode(!manualMode)} type="button" className="px-3 py-2 bg-slate-800 hover:bg-slate-700 transition rounded-xl text-xs md:text-sm flex items-center gap-1.5 border border-slate-700">
                <Sliders className="w-4 h-4" /> {manualMode ? t.btnAuto : t.btnSliders}
              </button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden divide-y divide-slate-800">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPlace(item)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-800 text-xs md:text-sm text-slate-200 transition flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Panel Coordenadas Manuales */}
        {showCoordsPanel && (
          <form onSubmit={handleManualCoordsSubmit} className="bg-slate-900 p-4 rounded-2xl border border-emerald-500/40 flex flex-wrap gap-4 items-end shadow-xl">
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs text-slate-400 block mb-1 font-medium">{t.latLabel} (-90 a 90):</label>
              <input type="number" step="any" placeholder="Ej. 6.15" value={manualLat} onChange={(e) => setManualLat(e.target.value)} className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs focus:outline-none focus:border-emerald-500 font-mono" />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs text-slate-400 block mb-1 font-medium">{t.lonLabel} (-180 a 180):</label>
              <input type="number" step="any" placeholder="Ej. -75.36" value={manualLon} onChange={(e) => setManualLon(e.target.value)} className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs focus:outline-none focus:border-emerald-500 font-mono" />
            </div>
            <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 transition rounded-xl text-xs font-semibold text-white flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" /> {t.btnSearchCoords}
            </button>
          </form>
        )}

        {/* Sliders Manuales */}
        {manualMode && (
          <div className="bg-slate-900 p-5 rounded-2xl border border-emerald-500/30 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="text-slate-400 flex items-center gap-1 mb-1"><Thermometer className="w-3.5 h-3.5 text-red-400" /> {t.tempLabel} ({temp}°C)</label>
              <input type="range" min="-5" max="50" value={temp} onChange={(e) => setTemp(Number(e.target.value))} className="w-full accent-emerald-500" />
            </div>
            <div>
              <label className="text-slate-400 flex items-center gap-1 mb-1"><Droplets className="w-3.5 h-3.5 text-blue-400" /> {t.rhLabel} ({rh}%)</label>
              <input type="range" min="0" max="100" value={rh} onChange={(e) => setRh(Number(e.target.value))} className="w-full accent-emerald-500" />
            </div>
            <div>
              <label className="text-slate-400 flex items-center gap-1 mb-1"><Wind className="w-3.5 h-3.5 text-teal-400" /> {t.wsLabel} ({ws} m/s)</label>
              <input type="range" min="0" max="25" step="0.5" value={ws} onChange={(e) => setWs(Number(e.target.value))} className="w-full accent-emerald-500" />
            </div>
            <div>
              <label className="text-slate-400 flex items-center gap-1 mb-1"><Sun className="w-3.5 h-3.5 text-amber-400" /> {t.srLabel} ({sr} W/m²)</label>
              <input type="range" min="0" max="1200" step="50" value={sr} onChange={(e) => setSr(Number(e.target.value))} className="w-full accent-emerald-500" />
            </div>
          </div>
        )}

        {/* Visor de Mapa con Capa Térmica Dinámica */}
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

        {/* Tarjetas de Diagnóstico Fisiológico y Pérdidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 space-y-3 shadow-xl">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {livestockMode === 'dairy' ? 'Índice DHLI (Leche)' : 'Índice HLI (Carne)'}
              </span>
              {hasShade && (
                <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Trees className="w-3 h-3" /> Con Sombra
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
              🧬 {selectedCoords ? result.meaning : 'Selecciona un punto en el mapa o busca tu municipio.'}
            </p>
          </div>

          <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 space-y-3 shadow-xl">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.cardClimateTitle}</span>
            <p className="text-xs text-emerald-400 truncate font-semibold">{loading ? '...' : placeName}</p>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>🌡️ {t.tempLabel}: <strong>{selectedCoords ? `${temp}°C` : '--'}</strong></div>
              <div>💧 {t.rhLabel}: <strong>{selectedCoords ? `${rh}%` : '--'}</strong></div>
              <div>💨 {t.wsLabel}: <strong>{selectedCoords ? `${ws} m/s` : '--'}</strong></div>
              <div>☀️ {t.srLabel}: <strong>{selectedCoords ? (hasShade ? `${(sr * 0.2).toFixed(0)} W/m²` : `${sr} W/m²`) : '--'}</strong></div>
            </div>
            <div className="pt-2 border-t border-slate-800 text-xs text-slate-400">
              {t.bgtLabel}: <strong className="text-white">{selectedCoords ? `${result.bgt}°C` : '--'}</strong> | Modo: <strong className="text-emerald-400">{livestockMode === 'dairy' ? `Leche (${dairyBreed})` : `Carne (${beefBreed})`}</strong>
            </div>
          </div>

          <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 space-y-3 shadow-xl">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.cardImpactTitle}</span>
              {selectedCoords && dailyMoneyLost > 0 && (
                <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded-full font-mono">
                  -${dailyMoneyLost.toLocaleString()} {currencySymbol}/día
                </span>
              )}
            </div>

            {livestockMode === 'dairy' ? (
              <div className="text-3xl font-black text-amber-400 pt-1">
                {selectedCoords ? ((result as any).milkLoss === 0 ? '0.0 L' : `-${(result as any).milkLoss} L`) : '--'}
                <span className="text-xs text-slate-400 font-normal"> / {t.milkLossUnit}</span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-3xl font-black text-amber-400 pt-1">
                  {selectedCoords ? ((result as any).adgLoss === 0 ? '0.00 kg' : `-${(result as any).adgLoss} kg`) : '--'}
                  <span className="text-xs text-slate-400 font-normal"> / {t.beefLossUnit}</span>
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
                <span className="font-semibold">{t.nightRecoveryTitle}</span>{' '}
                <span className={nightCoolingHours >= 6 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {nightCoolingHours}h ({nightCoolingHours >= 6 ? 'Óptima' : 'Alerta'})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel Predictivo Multiescala con Escenarios IPCC */}
        <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                📈 Módulo predictivo multiescala ({livestockMode === 'dairy' ? 'DHLI Leche' : 'HLI Carne'})
              </h3>
              <p className="text-xs text-slate-400">Predicción horaria, semanal y proyecciones hasta {maxYearLimit}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {timeTab === 'futuro' && (
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <span className="px-2 py-1 text-slate-400 flex items-center gap-1 font-medium">{t.scenarioLabel}</span>
                  <button onClick={() => setScenario('ssp245')} className={`px-2 py-1 rounded-lg font-semibold transition ${scenario === 'ssp245' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                    {t.scenarioMod}
                  </button>
                  <button onClick={() => setScenario('ssp585')} className={`px-2 py-1 rounded-lg font-semibold transition ${scenario === 'ssp585' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                    {t.scenarioHigh}
                  </button>
                </div>
              )}

              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button onClick={() => setTimeTab('24h')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${timeTab === '24h' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                  <Clock className="w-3.5 h-3.5" /> {t.tab24h}
                </button>
                <button onClick={() => setTimeTab('7d')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${timeTab === '7d' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                  <Calendar className="w-3.5 h-3.5" /> {t.tab7d}
                </button>
                <button onClick={() => setTimeTab('futuro')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${timeTab === 'futuro' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                  <TrendingUp className="w-3.5 h-3.5" /> {t.tabFuture}
                </button>
              </div>
            </div>
          </div>

          {/* 1. Vista 24 Horas */}
          {timeTab === '24h' && (
            <div className="space-y-2">
              <span className="text-xs text-slate-400">Variación horaria prevista del índice ({livestockMode === 'dairy' ? 'DHLI' : 'HLI'}):</span>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="dhliGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} />
                    <YAxis domain={[0, livestockMode === 'dairy' ? 100 : 120]} stroke="#94A3B8" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="DHLI" stroke="#10B981" fillOpacity={1} fill="url(#dhliGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 2. Vista 7 Días */}
          {timeTab === '7d' && (
            <div className="space-y-2">
              <span className="text-xs text-slate-400">Pico máximo esperado en la semana:</span>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} />
                    <YAxis domain={[0, livestockMode === 'dairy' ? 100 : 120]} stroke="#94A3B8" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                    <Bar dataKey="DHLI_Max" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 3. Vista Drill-Down (Años -> Meses -> Días) */}
          {timeTab === 'futuro' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setSelectedYear(null); setSelectedMonth(null); }} className={!selectedYear ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'}>
                    🌐 {t.yearsLabel} (2020 – {maxYearLimit})
                  </button>
                  {selectedYear && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      <button onClick={() => setSelectedMonth(null)} className={!selectedMonth ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'}>
                        📅 {t.yearLabel} {selectedYear.year}
                      </button>
                    </>
                  )}
                  {selectedMonth && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      <span className="text-emerald-400 font-bold">🗓️ {t.monthLabel} {selectedMonth.mes}</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span>{t.horizonLabel}</span>
                  {[2050, 2075, 2100].map((horizonte) => (
                    <button key={horizonte} onClick={() => setMaxYearLimit(horizonte)} className={`px-2 py-0.5 rounded ${maxYearLimit === horizonte ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-900 hover:bg-slate-800 text-slate-400'}`}>
                      {horizonte}
                    </button>
                  ))}
                  {(selectedYear || selectedMonth) && (
                    <button onClick={() => { setSelectedYear(null); setSelectedMonth(null); }} className="ml-2 text-xs text-slate-300 hover:text-white flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      <RotateCcw className="w-3 h-3" /> {t.allYearsBtn}
                    </button>
                  )}
                </div>
              </div>

              {/* NIVEL 1: Años */}
              {!selectedYear && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Haz clic en cualquier año para desglosar sus 12 meses:</span>
                    <span className="text-emerald-400 font-semibold">Modelo {scenario.toUpperCase()} (IPCC)</span>
                  </div>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={yearsList} onClick={(e: any) => { if (e?.activePayload?.[0]?.payload) setSelectedYear(e.activePayload[0].payload); }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="year" stroke="#94A3B8" fontSize={11} />
                        <YAxis domain={[0, livestockMode === 'dairy' ? 100 : 120]} stroke="#94A3B8" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                        <Line type="monotone" dataKey="DHLI_Anual" stroke="#EC4899" strokeWidth={3} dot={{ r: 3, cursor: 'pointer' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2 max-h-24 overflow-y-auto">
                    {yearsList.map((yItem) => (
                      <button key={yItem.year} onClick={() => setSelectedYear(yItem)} className="px-2.5 py-1 bg-slate-950 hover:bg-emerald-600 hover:text-white text-slate-300 rounded-lg text-xs border border-slate-800 transition">
                        {yItem.year}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* NIVEL 2: Meses */}
              {selectedYear && !selectedMonth && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Año <strong>{selectedYear.year}</strong> &mdash; Haz clic en un mes para ver sus 30 días:</span>
                    <span className="text-amber-400 font-semibold">Días críticos estimados: {selectedYear.Dias_Estres} días/año</span>
                  </div>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={selectedYear.months} onClick={(e: any) => { if (e?.activePayload?.[0]?.payload) setSelectedMonth(e.activePayload[0].payload); }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="mes" stroke="#94A3B8" fontSize={11} />
                        <YAxis domain={[0, livestockMode === 'dairy' ? 100 : 120]} stroke="#94A3B8" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                        <Bar dataKey="DHLI_Promedio" fill="#3B82F6" radius={[6, 6, 0, 0]} cursor="pointer" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2 pt-1">
                    {selectedYear.months.map((mItem: any) => (
                      <button key={mItem.mes} onClick={() => setSelectedMonth(mItem)} className="p-2 bg-slate-950 hover:bg-blue-600 rounded-xl text-xs border border-slate-800 transition text-center">
                        <div className="font-bold text-white">{mItem.mes}</div>
                        <div className="text-[10px] text-slate-400">{mItem.DHLI_Promedio} {livestockMode === 'dairy' ? 'DHLI' : 'HLI'}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* NIVEL 3: Días */}
              {selectedYear && selectedMonth && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Desglose diario para <strong>{selectedMonth.mes} {selectedYear.year}</strong>:</span>
                    <span className="text-emerald-400 font-semibold">Promedio mensual: {selectedMonth.DHLI_Promedio} {livestockMode === 'dairy' ? 'DHLI' : 'HLI'}</span>
                  </div>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={selectedMonth.days}>
                        <defs>
                          <linearGradient id="dayGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="dia" stroke="#94A3B8" fontSize={10} interval={2} />
                        <YAxis domain={[0, livestockMode === 'dairy' ? 100 : 120]} stroke="#94A3B8" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                        <Area type="monotone" dataKey="DHLI" stroke="#F59E0B" fillOpacity={1} fill="url(#dayGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>

      {/* Asistente Zootécnico IA Flotante (Consciente del Contexto y Guía de Uso) */}
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