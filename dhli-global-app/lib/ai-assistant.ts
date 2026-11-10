import { LivestockMode, DairyBreedType, BeefBreedType, YieldLevel } from './dhli-calculator';

export interface ChatContext {
  placeName: string;
  livestockMode: LivestockMode;
  indexVal: number;
  category: string;
  temp: number;
  rh: number;
  ws: number;
  sr: number;
  bgt: number;
  hasShade: boolean;
  dairyBreed: DairyBreedType;
  beefBreed: BeefBreedType;
  yieldLevel: YieldLevel;
  loss: number;
  nightCoolingHours: number;
  lang: 'es' | 'en' | 'pt';
}

export function generateAiResponse(userMessage: string, ctx: ChatContext): string {
  const q = userMessage.toLowerCase();
  const isDairy = ctx.livestockMode === 'dairy';
  const indexName = isDairy ? 'DHLI' : 'HLI';
  const breedName = isDairy ? ctx.dairyBreed.toUpperCase() : ctx.beefBreed.toUpperCase();

  // 1. GUÍA DE USO DE LA PLATAFORMA (CÓMO USAR CADA HERRAMIENTA)
  if (q.includes('como usar') || q.includes('cómo usar') || q.includes('ayuda') || q.includes('plataforma') || q.includes('funciona') || q.includes('instrucciones')) {
    return `🖥️ **GUÍA COMPLETA DE USO DE LA PLATAFORMA:**

1. **🥛 Leche vs 🥩 Carne:** Conmuta en la barra superior entre el modelo lácteo (**DHLI de Lees et al., 2018**) y el modelo de carne (**HLI de Gaughan et al., 2008**).
2. **🌍 Búsqueda de tu predio:**
   * **Buscador:** Escribe el municipio, vereda o país y selecciónalo.
   * **GPS:** Toca el botón verde *GPS* para usar tu ubicación actual en el potrero.
   * **Coordenadas:** Ingresa latitud y longitud manuales en grados decimales.
3. **🗺️ Visor Globo 3D vs Satélite 2D:**
   * **Globo 3D:** Gira el planeta para análisis global y visualización de países.
   * **Satélite 2D:** Haz zoom profundo hasta ver los potreros, cercas y establos de tu finca. Muestra isolíneas térmicas en tiempo real.
4. **☀️ A pleno sol vs 🌳 Con sombra:** Toca este botón para simular cómo colocar mallas o árboles (80% atenuación solar) reduce la temperatura de globo negro y previene pérdidas de leche/carne.
5. **⚙️ Configuración del hato:** Ajusta la raza (*Holstein, Jersey, Girolando, Doble propósito* en leche; *Angus, Brangus, Brahman* en carne) y el nivel productivo para recalibrar los umbrales fisiológicos.
6. **💰 Calculadora de pérdidas ($):** Ingresa tu número de animales y el precio por litro/kilo para calcular el dinero perdido y el Retorno de Inversión (ROI) de sombras o ventiladores.
7. **📈 Módulo Temporal:** Explora la curva de hoy (24 h), el pronóstico de la semana (7 d) y las proyecciones climáticas multianuales del IPCC hasta 2100.
8. **📲 WhatsApp y Reportes:** Envía en 1 clic el parte meteorológico al mayordomo o imprime el PDF técnico.`;
  }

  // 2. Cómo usar las Coordenadas y el GPS
  if (q.includes('coordenada') || q.includes('gps') || q.includes('buscar')) {
    return `📍 **CÓMO UBICAR TU PREDIO:**
* Si estás en la finca con tu celular o portátil, haz clic en **"Mi ubicación (GPS)"** y acepta el permiso del navegador.
* Si conoces las coordenadas, toca **"Coordenadas"**, escribe la latitud (ej. 6.15) y longitud (ej. -75.36) y presiona *Ir a coordenadas*.
* O simplemente escribe el nombre de tu municipio en la barra de búsqueda superior.`;
  }

  // 3. Cómo usar el Simulador de Sombra y ROI
  if (q.includes('como funciona la sombra') || q.includes('calculadora') || q.includes('roi')) {
    return `💰 **CÓMO USAR LA CALCULADORA Y LA SOMBRA:**
* **Botón de Sombra:** Al activarlo, la plataforma aplica la ecuación de Dimiceli & Piltz (2011) reduciendo el 80% de la radiación solar. Verás cómo la BGT cae de inmediato entre 4°C y 7°C.
* **Calculadora Financiera ($):** Haz clic en el botón amarillo. Ingresa cuántas vacas tienes en ordeño y a cómo te pagan el litro de leche. El sistema calculará en cuántos meses se paga solo un techo o sistema de aspersión con la leche que salvas.`;
  }

  // 4. Recomendaciones de Emergencia / Fisiología
  if (q.includes('emergencia') || q.includes('hacer') || q.includes('accion') || q.includes('medida') || q.includes('recomiend')) {
    if (ctx.indexVal >= 75) {
      return `🚨 **ALERTA CRÍTICA EN ${ctx.placeName.toUpperCase()}:**
Actualmente el índice ${indexName} está en **${ctx.indexVal}** (${ctx.category}). La carga térmica sobrepasa la capacidad de disipación de tus animales ${breedName}.

**Acciones inmediatas recomendadas (Lees et al. 2018 / Berman 2005):**
1. **Enfriamiento forzado en corral:** Activa ciclos de aspersión con gota gruesa (15-20 litros/vaca/hora) combinados con ventilación forzada en corrales de espera antes del ordeño.
2. **Agua de bebida:** Garantiza agua fresca (< 20°C) y sombra sobre los bebederos.
3. **Manejo de ración:** No suministres concentrado entre las 11:00 y las 15:00. Traslada la mayor parte de la ración a la tarde/noche para evitar el calor de fermentación en las horas pico.`;
    } else if (ctx.indexVal >= 50) {
      return `⚠️ **PRECAUCIÓN EN ${ctx.placeName.toUpperCase()}:**
El índice ${indexName} se ubica en **${ctx.indexVal}** (${ctx.category}). Pérdida estimada: **${ctx.loss} ${isDairy ? 'L/vaca/día' : 'kg/animal/día'}**.

1. ${ctx.hasShade ? '✅ Tienes sombra activada (80% interceptación). Mantén el acceso continuo.' : '☀️ Los animales están a pleno sol. Habilita sombras o silvopastoreo para bajar el estrés.'}
2. Suministra agua abundante y fresca cerca de las zonas de pastoreo.`;
    } else {
      return `✅ **CONDICIONES DE CONFORT EN ${ctx.placeName}:**
El índice ${indexName} es **${ctx.indexVal}** (${ctx.category}). Las vacas se encuentran en su rango de termoneutralidad homeotérmica. Mantén el manejo rutinario normal.`;
    }
  }

  // 5. Horarios de Pastoreo
  if (q.includes('hora') || q.includes('horario') || q.includes('pastoreo') || q.includes('alimentar')) {
    return `⏰ **HORARIOS RECOMENDADOS HOY EN ${ctx.placeName.toUpperCase()}:**
* 🌅 **Pastoreo matutino:** 05:30 a 09:30 (Ventana térmica segura).
* ☀️ **Encierro en sombra / corral:** 10:30 a 15:30 (Pico máximo de ${indexName}).
* 🌇 **Pastoreo de tarde y noche:** 16:30 a 22:00.
* 🌙 **Recuperación nocturna:** Se registraron **${ctx.nightCoolingHours} horas** de enfriamiento nocturno favorable.`;
  }

  // 6. Respuesta General
  return `🐄 **ASESOR ZOOTÉCNICO & GUÍA DEL SISTEMA:**
En **${ctx.placeName}**, el índice **${indexName}** actual es **${ctx.indexVal}** (${ctx.category}).
Pérdida productiva estimada: **${ctx.loss} ${isDairy ? 'L/vaca/día' : 'kg/animal/día'}** en ganado ${breedName}.

**¿Qué deseas consultar?**
1. Escribe *"¿Cómo uso la plataforma?"* para ver la guía de funciones.
2. Escribe *"¿Qué medidas de emergencia debo tomar hoy?"*.
3. Escribe *"¿Cuáles son los mejores horarios de pastoreo?"*.
4. Escribe *"¿Cómo funciona la calculadora de ROI?"*.`;
}