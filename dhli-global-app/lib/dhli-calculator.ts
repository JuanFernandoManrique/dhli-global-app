// ============================================================================
// MOTOR BIOFÍSICO INTEGRAL: LECHE (DHLI) Y CARNE (HLI)
// ============================================================================

export interface ClimateData {
  temperature: number;      // °C (Ta)
  relativeHumidity: number; // % (RH: 0 - 100)
  windSpeed: number;        // m/s (WS)
  solarRadiation: number;   // W/m² (S)
}

export type LivestockMode = 'dairy' | 'beef';
export type DairyBreedType = 'holstein' | 'jersey' | 'girolando' | 'cross';
export type BeefBreedType = 'angus' | 'brangus' | 'brahman';
export type YieldLevel = 'low' | 'medium' | 'high';

/**
 * 1. TEMPERATURA DE GLOBO NEGRO (BGT / Tg) - Dimiceli & Piltz (2011) - NOAA/NWS
 */
export function estimateBGT(
  t: number,
  rh: number,
  ws: number,
  sr: number,
  hasShade: boolean = false,
  pressureMb: number = 1013.25,
  zenithDeg: number = 35
): number {
  if (sr <= 0) return t; // Periodo nocturno converge con Ta

  const effectiveSr = hasShade ? sr * 0.20 : sr; // 80% atenuación por sombra
  const u_m_per_hour = Math.max(ws, 0.1) * 3600; // m/s a m/h
  const sigma = 5.67e-8;
  const z_rad = (zenithDeg * Math.PI) / 180;
  const cos_z = Math.max(Math.cos(z_rad), 0.087);

  const td = t - ((100 - rh) / 5);
  const ea = Math.exp((17.67 * (td - t)) / (td + 243.5)) *
             (1.0007 + 0.00000346 * pressureMb) *
             6.112 * Math.exp((17.502 * t) / (240.97 + t));

  const eps_a = 0.575 * Math.pow(Math.max(ea, 0.01), 1 / 7);
  const C = (0.315 * Math.pow(u_m_per_hour, 0.58)) / 5.3865e-8;
  const fdb = 0.70;
  const fdif = 0.30;
  const B = effectiveSr * ((fdb / (4 * sigma * cos_z)) + ((1.2 / sigma) * fdif)) + (eps_a * Math.pow(t, 4));

  const tg = (B + C * t + 7680000) / (C + 256000);
  return Math.max(tg, t);
}

/**
 * 2. MODELO LECHERO DHLI (Lees et al., 2018) + Pérdidas validadas
 */
export function calculateDHLI(
  bgt: number,
  rhPercent: number,
  lang: 'es' | 'en' | 'pt' = 'es',
  breed: DairyBreedType = 'holstein',
  yieldLevel: YieldLevel = 'medium'
) {
  const rhDec = rhPercent > 1.0 ? rhPercent / 100.0 : rhPercent;

  // Ecuación oficial pura de Lees et al. (2018)
  const z = -8.50749 + (0.206159 * bgt) + (4.088399 * rhDec);
  const mps = 1.681813 / (1.0 + Math.exp(-z));

  let dhli = ((mps - 0.0002) / (1.6812 - 0.0002)) * 100.0;
  dhli = Math.min(Math.max(dhli, 0), 100);

  // Umbrales de claudicación térmica y tasas de merma (Berman, 2005; Boonkum et al., 2024; Chen et al., 2024; DairyNZ, 2017)
  let dhliThreshold = 25.0;
  let milkLossFactor = 0.08;

  if (breed === 'holstein') {
    if (yieldLevel === 'high') {
      dhliThreshold = 22.0; // Berman (2005): alta producción reduce umbral en 5°C
      milkLossFactor = 0.14; // Chen et al. (2024)
    } else if (yieldLevel === 'low') {
      dhliThreshold = 28.0;
      milkLossFactor = 0.05;
    } else {
      dhliThreshold = 25.0;
      milkLossFactor = 0.08;
    }
  } else if (breed === 'jersey') {
    dhliThreshold = 32.0; // DairyNZ (2017) & Smith et al. (2013): Jersey tolera 6-7 unidades más
    milkLossFactor = 0.06;
  } else if (breed === 'girolando') {
    dhliThreshold = 38.0; // Carvalheira et al. (2021) & Boonkum et al. (2024)
    milkLossFactor = 0.05;
  } else if (breed === 'cross') {
    dhliThreshold = 42.0; // Gantner et al. (2017) & Kadzere et al. (2002)
    milkLossFactor = 0.04;
  }

  const milkLoss = dhli < dhliThreshold ? 0 : Number(((dhli - dhliThreshold) * milkLossFactor).toFixed(1));

  let category = 'Sin estrés (Confort)';
  let color = '#10B981';
  let meaning = 'Zona de confort térmico y balance homeotérmico. Respiración normal (≤ 60 rpm) y sin jadeo (PS = 0).';

  if (dhli >= 25.0 && dhli < 50.0) {
    category = 'Estrés leve';
    color = '#FBBF24';
    meaning = 'Termorregulación activa. Jadeo inicial de boca cerrada y movimiento torácico (60 - 90 rpm, PS = 1).';
  } else if (dhli >= 50.0 && dhli < 75.0) {
    category = 'Estrés alto';
    color = '#F97316';
    meaning = 'Carga calórica elevada sobrepasando termodisipación. Jadeo rápido con babeo continuo (90 - 120 rpm, PS = 2 - 2.5).';
  } else if (dhli >= 75.0) {
    category = 'Estrés crítico';
    color = '#EF4444';
    meaning = 'Sobrecarga térmica severa e hipertermia. Jadeo vigoroso con boca abierta y lengua protruida (> 120 rpm, PS ≥ 3).';
  }

  return {
    indexVal: Number(dhli.toFixed(1)),
    mps: Number(mps.toFixed(2)),
    bgt: Number(bgt.toFixed(1)),
    milkLoss,
    category,
    color,
    meaning,
  };
}

/**
 * 3. MODELO CÁRNICO HLI & AHL (Gaughan et al., 2008 / Mader et al., 2006)
 */
export function calculateHLI_Beef(
  bgt: number,
  rhPercent: number,
  ws: number,
  lang: 'es' | 'en' | 'pt' = 'es',
  beefBreed: BeefBreedType = 'angus'
) {
  const rh = rhPercent > 1.0 ? rhPercent : rhPercent * 100;
  const clampedWs = Math.max(ws, 0.1);

  // Ecuación segmentada oficial (Gaughan et al., 2008)
  let hli = 0;
  if (bgt <= 25.0) {
    hli = 10.66 + (0.28 * rh) + (1.30 * bgt) - clampedWs;
  } else {
    hli = 8.62 + (0.38 * rh) + (1.55 * bgt) - (0.50 * clampedWs) + Math.exp(2.4 - clampedWs);
  }
  hli = Math.max(0, Math.min(130, hli));

  // Umbrales raciales (Gaughan et al., 2008)
  let tComfort = 70.0;
  let tMild = 77.0;
  let tSevere = 86.0;

  if (beefBreed === 'brangus') {
    tComfort = 73.0; tMild = 80.0; tSevere = 89.0;
  } else if (beefBreed === 'brahman') {
    tComfort = 76.0; tMild = 84.0; tSevere = 93.0;
  }

  let category = 'Sin estrés (Confort)';
  let color = '#10B981';
  let adgLoss = 0.0;
  let dmiDrop = 0;
  let extraDays = 0;
  let meaning = 'Zona de termoneutralidad. Consumo voluntario óptimo (100%) y ganancia diaria de peso normal.';

  if (hli >= tComfort && hli < tMild) {
    category = 'Estrés leve';
    color = '#FBBF24';
    adgLoss = 0.12;
    dmiDrop = 6;
    extraDays = 5;
    meaning = 'Inicio de estrés calórico. Disminución ligera en consumo de pasto/ración (3-8%) y menor ganancia de peso.';
  } else if (hli >= tMild && hli < tSevere) {
    category = 'Estrés alto';
    color = '#F97316';
    adgLoss = 0.28;
    dmiDrop = 16;
    extraDays = 15;
    meaning = 'Carga calórica elevada. Reducción marcada del consumo (10-20%), aumento en jadeo y pérdida diaria de peso.';
  } else if (hli >= tSevere) {
    category = 'Estrés crítico';
    color = '#EF4444';
    adgLoss = 0.52;
    dmiDrop = 32;
    extraDays = 35;
    meaning = 'Sobrecarga térmica severa en corral/potrero. Fuerte caída en consumo (>25%), riesgo de acidosis y retraso severo a faena.';
  }

  return {
    indexVal: Number(hli.toFixed(1)),
    mps: Number((hli / 25).toFixed(2)),
    bgt: Number(bgt.toFixed(1)),
    adgLoss,
    dmiDrop,
    extraDays,
    category,
    color,
    meaning,
  };
}