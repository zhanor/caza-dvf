import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import pool from '@/lib/db';
import { rateLimiter, getClientIp } from '@/lib/security';
import { getRegionalSeries, fetchInseeSeries, computeEvolution, getLocalIndex } from '@/lib/indices';

const NATIONAL_IDBANK = '010567119';

// Trouve le département du point recherché via la transaction DVF la plus proche (index GIST déjà en place)
async function findDepartement(lat, lng) {
  const query = `
    SELECT code_departement
    FROM transactions
    WHERE geom IS NOT NULL
    ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
    LIMIT 1;
  `;
  const result = await pool.query(query, [lng, lat]);
  return result.rows[0]?.code_departement || null;
}

const getCachedLocalIndex = (codeDepartement) => {
  const cachedFn = unstable_cache(
    () => getLocalIndex(pool, codeDepartement),
    [`dvf-local-index-${codeDepartement}`],
    { revalidate: 86400, tags: ['dvf-local-index'] }
  );
  return cachedFn();
};

export async function GET(request) {
  const rl = rateLimiter.check(`indices:${getClientIp(request)}`, 60, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat'));
  const lng = parseFloat(searchParams.get('lng'));

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Paramètres lat/lng invalides' }, { status: 400 });
  }

  try {
    const codeDepartement = await findDepartement(lat, lng);
    const regional = getRegionalSeries(codeDepartement);

    const [nationalSeries, regionalSeries, local] = await Promise.all([
      fetchInseeSeries(NATIONAL_IDBANK),
      fetchInseeSeries(regional.idbank),
      codeDepartement ? getCachedLocalIndex(codeDepartement) : null,
    ]);

    const national = nationalSeries ? {
      label: 'France (Notaires-INSEE)',
      unAn: computeEvolution(nationalSeries, 4),
      cinqAns: computeEvolution(nationalSeries, 20),
    } : null;

    const regionalResult = regionalSeries ? {
      label: regional.label,
      unAn: computeEvolution(regionalSeries, 4),
      cinqAns: computeEvolution(regionalSeries, 20),
    } : null;

    return NextResponse.json({
      codeDepartement,
      national,
      regional: regionalResult,
      local,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    });
  } catch (error) {
    console.error('[api/indices]', error.message);
    return NextResponse.json({ error: 'Erreur lors de la récupération des indices' }, { status: 500 });
  }
}
