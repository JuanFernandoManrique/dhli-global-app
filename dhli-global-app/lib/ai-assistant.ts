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

  // 1. Ayuda sobre cómo usar la plataforma
  if (q.includes('como usar') || q.includes('cómo usar') || q.includes('ayuda') || q.includes('plataforma') || q.includes('manual') || q.includes('buscar')) {
    return `Guía de uso de la plataforma:

1. Selección de producción: Usa el selector superior para alternar entre leche (DHLI) y carne (HLI).
2. Localización de la finca: Puedes escribir el nombre del municipio en el buscador, tocar el botón GPS para ubicarte automáticamente en el potrero o ingresar coordenadas manuales de latitud y longitud.
3. Vistas de mapa: Conmuta entre el globo 3D y el satélite 2D de alta resolución para ver los potreros y establos de tu predio.
4. Activación de capas: En el mapa satelital puedes encender la capa térmica de estrés cuando lo consideres necesario desde el ícono de capas.
5. Botón de sombra: Simula la reducción de radiación del 80% al proporcionar árboles o mallas en tu predio.
6. Calculadora financiera: Ubicada en la parte superior para proyectar el dinero en riesgo y el tiempo de recuperación de inversiones en infraestructura.
7. Filtro temporal en 4 clics: Selecciona directamente el año, mes, día y hora en el panel predictivo inferior.`;
  }

  // 2. Medidas de emergencia según severidad
  if (q.includes('emergencia') || q.includes('hacer') || q.includes('medida') || q.includes('recomiend') || q.includes('calor')) {
    if (ctx.indexVal >= (isDairy ? 75 : 86)) {
      return `Alerta de sobrecarga térmica crítica en ${ctx.placeName}:
El índice ${indexName} se sitúa en ${ctx.indexVal} (${ctx.category}). La disipación de calor está severamente comprometida en animales ${breedName}.

Protocolo de mitigación inmediata:
- Enfriamiento forzado: Aplica ciclos de aspersión con gota gruesa durante 30 a 45 minutos combinados con ventilación forzada en el corral de espera antes del ordeño.
- Hidratación: Garantiza un flujo mínimo de 15 a 20 litros por animal cada hora con agua a temperatura menor a 20 °C en bebederos sombreados.
- Manejo de ración: Suspende el suministro de concentrado entre las 11:00 y las 15:30. Traslada la mayor fracción de la dieta hacia las horas de la tarde y noche para disipar el incremento calórico de la digestión.`;
    } else if (ctx.indexVal >= (isDairy ? 50 : 77)) {
      return `Condición de estrés moderado a alto en ${ctx.placeName}:
El índice ${indexName} es de ${ctx.indexVal} (${ctx.category}), con una merma productiva estimada en ${ctx.loss} ${isDairy ? 'litros/vaca/día' : 'kg/animal/día'}.

Recomendaciones zootécnicas:
- Sombras: ${ctx.hasShade ? 'La mitigación por sombra está activa en tu análisis. Asegura el libre acceso en potreros.' : 'Los animales se encuentran a pleno sol. Habilita mallas o áreas con silvopastoreo para bajar la temperatura de globo negro.'}
- Suplementación mineral: Aumenta los electrolitos (sodio y potasio) para compensar pérdidas por transpiración y jadeo.`;
    } else {
      return `Condición de confort térmico en ${ctx.placeName}:
El índice ${indexName} se encuentra en ${ctx.indexVal} (${ctx.category}). Los animales se encuentran en equilibrio homeotérmico normal. Mantén las rutinas habituales de pastoreo y suministro de agua.`;
    }
  }

  // 3. Alimentación y ración
  if (q.includes('comida') || q.includes('dieta') || q.includes('racion') || q.includes('alimentar') || q.includes('nutricion')) {
    return `Estrategia nutricional ante estrés calórico:
- Modificación de horarios: Ofrece el 60% al 70% del alimento fibroso y suplementos concentrados entre las 18:00 y las 05:00 horas, aprovechando las ${ctx.nightCoolingHours} horas de enfriamiento nocturno registradas en tu predio.
- Densidad energética: Aumenta la concentración energética de la ración mediante grasas sobrepasantes o almidones de alta digestibilidad para compensar la caída voluntaria de consumo de materia seca sin sobrecargar el rumen.`;
  }

  // 4. Razas y genética
  if (q.includes('raza') || q.includes('holstein') || q.includes('girolando') || q.includes('jersey') || q.includes('angus') || q.includes('brahman')) {
    return `Tolerancia genética y características raciales:
- Holstein y Angus: Presentan una tasa metabólica elevada y mayor susceptibilidad al estrés por calor; inician caídas en producción a umbrales menores.
- Jersey: Posee mayor relación entre superficie corporal y masa, tolerando cargas térmicas más altas antes de manifestar mermas severas.
- Girolando y Brahman: Incorporan genes adaptados al trópico con mayor densidad folicular y glándulas sudoríparas más eficientes, manteniendo el consumo y estabilidad térmica en climas cálidos.`;
  }

  // 5. Horarios de pastoreo
  if (q.includes('hora') || q.includes('horario') || q.includes('pastoreo') || q.includes('encierro')) {
    return `Horarios sugeridos de manejo para hoy en ${ctx.placeName}:
- Pastoreo seguro: Desde las 05:30 hasta las 09:30 horas y después de las 16:30 horas.
- Encierro en áreas sombreadas: Entre las 10:30 y las 15:30 horas, coincidiendo con la máxima radiación solar (${ctx.sr} W/m²).`;
  }

  // Respuesta general contextualizada
  return `Asistente zootécnico en ${ctx.placeName}:
Actualmente el índice ${indexName} se encuentra en ${ctx.indexVal} (${ctx.category}), con una temperatura de ${ctx.temp} °C y una radiación solar de ${ctx.sr} W/m².

¿En qué puedo ayudarte?
- Pregúntame: "¿Cómo usar la plataforma?" para conocer el manejo de cada herramienta.
- Pregúntame: "¿Qué medidas inmediatas debo tomar hoy?".
- Pregúntame: "¿Cuáles son los mejores horarios de pastoreo y alimentación?".`;
}