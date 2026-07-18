import { NextResponse } from 'next/server';
import { rateLimiter, getClientIp } from '@/lib/security';

// Indice du Coût de la Construction (ICC) — INSEE, idbank 000008630, base 100 = T4 1953
const ICC_IDBANK = '000008630';
const BDM_URL = 'https://www.bdm.insee.fr/series/sdmx/data/SERIES_BDM';

export async function GET(request) {
  const rl = rateLimiter.check(`icc:${getClientIp(request)}`, 60, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 });
  }

  try {
    const res = await fetch(`${BDM_URL}/${ICC_IDBANK}`, {
      headers: { Accept: 'application/xml' },
      next: { revalidate: 604800, tags: ['icc-index'] }, // 7 jours — série trimestrielle
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Erreur API INSEE' }, { status: 502 });
    }

    const xml = await res.text();
    const obsRegex = /<Obs\s+TIME_PERIOD="(\d{4})-Q(\d)"\s+OBS_VALUE="([^"]+)"/g;
    const series = {};
    let latest = null;
    let match;
    while ((match = obsRegex.exec(xml)) !== null) {
      const [, year, q, value] = match;
      const key = `${year}-T${q}`;
      series[key] = parseFloat(value);
      // Le flux SDMX liste les trimestres du plus récent au plus ancien
      if (!latest) latest = { quarter: `T${q} ${year}`, value: parseFloat(value) };
    }

    if (!latest) {
      return NextResponse.json({ error: 'Aucune donnée ICC disponible' }, { status: 502 });
    }

    return NextResponse.json({ series, latest }, {
      headers: { 'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=2592000' },
    });
  } catch (error) {
    console.error('[api/icc]', error.message);
    return NextResponse.json({ error: 'Erreur réseau' }, { status: 500 });
  }
}
