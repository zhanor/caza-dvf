import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getPool } from '@/lib/db';

// Fonction de validation des paramètres
function validateParams(lat, lng, radius) {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const radiusNum = parseInt(radius, 10);

  // Validation des coordonnées
  if (isNaN(latNum) || isNaN(lngNum)) {
    return { valid: false, error: 'Coordonnées invalides' };
  }

  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
    return { valid: false, error: 'Coordonnées hors limites' };
  }

  // Validation du rayon (minimum 50m, maximum 5000m)
  if (isNaN(radiusNum) || radiusNum < 50) {
    return { valid: false, error: 'Rayon minimum de 50m requis' };
  }

  if (radiusNum > 5000) {
    return { valid: false, error: 'Rayon maximum de 5000m' };
  }

  return { valid: true, lat: latNum, lng: lngNum, radius: radiusNum };
}

// Fonction de requête avec cache (clé basée sur les paramètres)
async function getCachedTransactions(lat, lng, radius, limit, offset) {
  const cacheKey = `dvf-search-${lat}-${lng}-${radius}-${limit}-${offset}`;
  
  return unstable_cache(
    async () => {
      const pool = getPool();
      
      // Requête optimisée avec projection minimale et index spatial (PostgreSQL/PostGIS)
      const query = `
        SELECT 
          id_mutation,
          MAX(date_mutation) as date_mutation,
          MAX(valeur_fonciere) as valeur_fonciere,
          MAX(adresse_numero) as adresse_numero,
          MAX(adresse_nom_voie) as adresse_nom_voie,
          MAX(code_postal) as code_postal,
          MAX(nom_commune) as nom_commune,
          MAX(id_parcelle) as id_parcelle,
          COALESCE(STRING_AGG(DISTINCT type_local, ', '), 'Terrain') as type_local,
          SUM(surface_reelle_bati) as surface_reelle_bati, 
          MAX(surface_terrain) as surface_terrain,
          MAX(latitude) as latitude,
          MAX(longitude) as longitude
        FROM transactions
        WHERE ST_DWithin(
          geom::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
        AND (
          type_local IN ('Maison', 'Appartement', 'Local industriel. commercial ou assimilé') 
          OR 
          (type_local IS NULL AND surface_terrain > 0)
        ) 
        GROUP BY id_mutation
        ORDER BY date_mutation DESC
        LIMIT $4 OFFSET $5;
      `;

      const startTime = Date.now();
      const result = await pool.query(query, [lng, lat, radius, limit, offset]);
      const queryTime = Date.now() - startTime;
      
      // Log de performance (seulement en développement)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] Requête exécutée en ${queryTime}ms`);
      }

      return result.rows;
    },
    [cacheKey],
    {
      revalidate: 3600, // Cache pendant 1 heure
      tags: ['dvf-search']
    }
  )();
}

// Fonction pour obtenir le nombre total de résultats (pour la pagination)
async function getTotalCount(lat, lng, radius) {
  const cacheKey = `dvf-count-${lat}-${lng}-${radius}`;
  
  return unstable_cache(
    async () => {
      const pool = getPool();
      
      const countQuery = `
        SELECT COUNT(DISTINCT id_mutation) as total
        FROM transactions
        WHERE ST_DWithin(
          geom::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
        AND (
          type_local IN ('Maison', 'Appartement', 'Local industriel. commercial ou assimilé') 
          OR 
          (type_local IS NULL AND surface_terrain > 0)
        );
      `;

      const result = await pool.query(countQuery, [lng, lat, radius]);
      return parseInt(result.rows[0].total, 10);
    },
    [cacheKey],
    {
      revalidate: 3600,
      tags: ['dvf-count']
    }
  )();
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radiusParam = searchParams.get('radius');
  const pageParam = searchParams.get('page');
  const limitParam = searchParams.get('limit');

  // Validation des paramètres requis
  if (!lat || !lng) {
    return NextResponse.json(
      { error: 'Coordonnées manquantes (lat et lng requis)' },
      { status: 400 }
    );
  }

  // Validation et normalisation des paramètres
  const validation = validateParams(lat, lng, radiusParam || 500);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  const { lat: latNum, lng: lngNum, radius } = validation;

  // Pagination
  const limit = Math.min(parseInt(limitParam || '100', 10), 500); // Max 500 résultats par page
  const page = Math.max(parseInt(pageParam || '1', 10), 1);
  const offset = (page - 1) * limit;

  try {
    // Exécution en parallèle : données + count total
    const [transactions, totalCount] = await Promise.all([
      getCachedTransactions(latNum, lngNum, radius, limit, offset),
      getTotalCount(latNum, lngNum, radius)
    ]);

    return NextResponse.json({
      data: transactions,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + transactions.length < totalCount
      },
      meta: {
        lat: latNum,
        lng: lngNum,
        radius,
        cached: true // Indique que les données peuvent être en cache
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });

  } catch (error) {
    console.error('[API Error]', {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      params: { lat: latNum, lng: lngNum, radius }
    });

    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des données',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
