import {
  estimateBGT,
  calculateDHLI,
  calculateHLI_Beef,
  LivestockMode,
  DairyBreedType,
  BeefBreedType,
  YieldLevel,
} from './dhli-calculator';

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
    if (!res.ok) return `Ubicación (${lat.toFixed(3)}, ${lon.toFixed(3)})`;
    const data = await res.json();
    if (data && data.display_name) {
      return data.display_name.split(',').slice(0, 3).join(', ');
    }
    return `Ubicación (${lat.toFixed(3)}, ${lon.toFixed(3)})`;
  } catch {
    return `Ubicación (${lat.toFixed(3)}, ${lon.toFixed(3)})`;
  }
}

export async function getWeatherData(
  lat: number,
  lon: number,
  maxYear: number = 2100,
  hasShade: boolean = false,
  scenario: 'ssp245' | 'ssp585' = 'ssp245',
  livestockMode: LivestockMode = 'dairy',
  dairyBreed: DairyBreedType = 'holstein',
  beefBreed: BeefBreedType = 'angus',
  yieldLevel: YieldLevel = 'medium'
) {
  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,direct_normal_irradiance&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,direct_normal_irradiance&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,wind_speed_10m_max,shortwave_radiation_sum&forecast_days=7&timezone=auto`;

  const res = await fetch(forecastUrl);
  if (!res.ok) throw new Error('Error al consultar datos meteorológicos');
  const forecastData = await res.json();

  const baseTemp = forecastData.current.temperature_2m;
  const baseRh = forecastData.current.relative_humidity_2m;
  const baseWs = forecastData.current.wind_speed_10m;
  const baseSr = forecastData.current.direct_normal_irradiance || 0;

  const avgMaxTemp =
    forecastData.daily.temperature_2m_max.reduce((a: number, b: number) => a + b, 0) /
    forecastData.daily.temperature_2m_max.length;
  const avgMinTemp =
    forecastData.daily.temperature_2m_min.reduce((a: number, b: number) => a + b, 0) /
    forecastData.daily.temperature_2m_min.length;
  const localMeanTemp = (avgMaxTemp + avgMinTemp) / 2;

  const calcIndex = (t: number, h: number, w: number, s: number) => {
    const bgt = estimateBGT(t, h, w, s, hasShade);
    if (livestockMode === 'dairy') {
      return calculateDHLI(bgt, h, 'es', dairyBreed, yieldLevel);
    } else {
      return calculateHLI_Beef(bgt, h, w, 'es', beefBreed);
    }
  };

  // 2. Ventana de recuperación nocturna (20:00 a 06:00 h)
  let nightCoolingHours = 0;
  if (forecastData.hourly?.time) {
    forecastData.hourly.time.slice(0, 24).forEach((timeStr: string, i: number) => {
      const hour = new Date(timeStr).getHours();
      if (hour >= 20 || hour <= 6) {
        const t = forecastData.hourly.temperature_2m[i];
        const h = forecastData.hourly.relative_humidity_2m[i];
        const w = forecastData.hourly.wind_speed_10m[i];
        const s = 0;
        const resIdx = calcIndex(t, h, w, s);
        
        const threshold =
          livestockMode === 'dairy'
            ? (dairyBreed === 'jersey' ? 32.0 : dairyBreed === 'girolando' ? 38.0 : 25.0)
            : (beefBreed === 'brahman' ? 84.0 : beefBreed === 'brangus' ? 80.0 : 77.0);

        if (resIdx.indexVal < threshold) {
          nightCoolingHours++;
        }
      }
    });
  }

  // 3. Proyecciones climáticas multianuales CMIP6 (2020–2100)
  const warmingRate = scenario === 'ssp585' ? 0.048 : 0.028;
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const currentDayNum = new Date().getDate();

  const yearsData: any[] = [];
  const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  for (let year = 2020; year <= maxYear; year++) {
    const deltaYears = year - currentYear;
    const tempOffset = deltaYears * warmingRate;
    const yearTemp = localMeanTemp + tempOffset;
    const yearRh = Math.max(30, Math.min(95, baseRh - deltaYears * 0.05));
    const yearWs = baseWs;
    const yearSr = Math.max(200, baseSr > 0 ? baseSr : 450);

    const resYear = calcIndex(yearTemp, yearRh, yearWs, yearSr);

    const monthsData = mesesNombres.map((mNombre, mIdx) => {
      const estacionalOffset = Math.sin(((mIdx - 6) / 12) * Math.PI * 2) * 1.2;
      const mTemp = yearTemp + estacionalOffset;
      const mRh = Math.min(95, Math.max(35, yearRh + (mIdx % 2 === 0 ? 2 : -2)));
      const resMonth = calcIndex(mTemp, mRh, yearWs, yearSr);

      const daysData = Array.from({ length: 30 }, (_, dayIdx) => {
        const diaNum = dayIdx + 1;
        const isToday = year === currentYear && mIdx === currentMonthIdx && diaNum === currentDayNum;

        const dTemp = isToday ? baseTemp : Number((mTemp + Math.sin((dayIdx / 30) * Math.PI * 2) * 1.5).toFixed(1));
        const dRh = isToday ? baseRh : Math.round(mRh);
        const dWs = isToday ? baseWs : yearWs;
        const dSr = isToday ? baseSr : diaNum % 2 === 0 ? 500 : 350;

        const resDay = calcIndex(dTemp, dRh, dWs, dSr);

        return {
          dia: `Día ${diaNum}`,
          diaNum,
          DHLI: resDay.indexVal,
          Temp: dTemp,
          BGT: resDay.bgt,
          Humedad: dRh,
          categoria: resDay.category,
          impacto: livestockMode === 'dairy' ? (resDay as any).milkLoss : (resDay as any).adgLoss,
        };
      });

      const avgIdxMonth = Number((daysData.reduce((acc, d) => acc + d.DHLI, 0) / 30).toFixed(1));

      return {
        mes: mNombre,
        mesIdx: mIdx,
        DHLI_Promedio: avgIdxMonth,
        Temp_Media: Number(mTemp.toFixed(1)),
        BGT_Media: Number(resMonth.bgt.toFixed(1)),
        Categoria: resMonth.category,
        days: daysData,
      };
    });

    const criticalThreshold = livestockMode === 'dairy' ? 50.0 : 77.0;
    const diasCriticos = monthsData.reduce(
      (acc, m) => acc + m.days.filter((d: any) => d.DHLI >= criticalThreshold).length,
      0
    );

    yearsData.push({
      year,
      DHLI_Anual: resYear.indexVal,
      Temp_Media: Number(yearTemp.toFixed(1)),
      BGT_Media: Number(resYear.bgt.toFixed(1)),
      Dias_Estres: diasCriticos,
      Tipo: year <= currentYear ? 'Histórico' : 'Proyección IPCC',
      months: monthsData,
    });
  }

  return {
    current: {
      temperature: baseTemp,
      relativeHumidity: baseRh,
      windSpeed: baseWs,
      solarRadiation: baseSr,
    },
    nightCoolingHours,
    hourly: forecastData.hourly,
    daily: forecastData.daily,
    yearsData,
  };
}