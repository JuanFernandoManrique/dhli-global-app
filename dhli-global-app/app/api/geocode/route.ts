import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  const headers = {
    'User-Agent': 'DHLI-Global-Predictor/1.0 (agroclimatic-tool)',
    'Accept-Language': 'es,en,pt',
  };

  try {
    // 1. Búsqueda por nombre
    if (q) {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`;
      const res = await fetch(url, { headers });
      if (!res.ok) return NextResponse.json([]);
      const data = await res.json();
      return NextResponse.json(data);
    }

    // 2. Geocodificación inversa por lat/lon
    if (lat && lon) {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14`;
      const res = await fetch(url, { headers });
      if (!res.ok) return NextResponse.json({ display_name: `Coordenadas (${lat}, ${lon})` });
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json([]);
  } catch (error) {
    return NextResponse.json([]);
  }
}