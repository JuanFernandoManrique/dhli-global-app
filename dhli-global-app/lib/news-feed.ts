export interface NewsItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  imageUrl: string;
  date: string;
  linkText?: string;
}

// Puedes agregar, editar o quitar noticias aquí fácilmente
export const initialNewsFeed: NewsItem[] = [
  {
    id: '1',
    title: 'Impacto del estrés calórico en la calidad y proteína de la leche',
    category: 'Investigación zootécnica',
    summary: 'El incremento de la temperatura de globo negro reduce la síntesis de caseína en más de un 15% antes de evidenciarse caídas volumétricas.',
    imageUrl: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=800&q=80',
    date: 'Actualizado recientemente',
    linkText: 'Leer informe biofísico',
  },
  {
    id: '2',
    title: 'Eficacia de las mallas de sombra al 80% en silvopastoreo',
    category: 'Manejo en potrero',
    summary: 'La interceptación de la radiación solar directa reduce la BGT entre 4°C y 7°C, permitiendo una recuperación del consumo voluntario.',
    imageUrl: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=800&q=80',
    date: 'Boletín técnico',
    linkText: 'Ver recomendaciones',
  },
  {
    id: '3',
    title: 'Ventanas de enfriamiento nocturno y bienestar del hato',
    category: 'Fisiología animal',
    summary: 'Tener al menos 6 horas continuas con índices inferiores al umbral crítico durante la noche es indispensable para evitar el calor acumulado.',
    imageUrl: 'https://images.unsplash.com/photo-1527153857715-3908f2ae5e81?auto=format&fit=crop&w=800&q=80',
    date: 'Divulgación agropecuaria',
    linkText: 'Consultar protocolo',
  },
];