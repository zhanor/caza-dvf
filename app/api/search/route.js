import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import pool from '@/lib/db';
import { rateLimiter, getClientIp } from '@/lib/security';
import { agregerMutations } from '@/lib/dvf-mutation';
import { DVF_SOURCE, DVF_SOURCE_LABEL } from '@/lib/dvf-source';

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

  const cachedFn = unstable_cache(
    async () => {
      // Deux étapes volontairement séparées.
      //
      // 1. `candidats` sélectionne les mutations dans le rayon, avec les mêmes filtres
      //    qu'avant (nature + type de bien) et la pagination.
      // 2. La requête principale ramène ensuite TOUTES les lignes de ces mutations,
      //    dépendances et lignes sans type_local comprises.
      //
      // Cette seconde étape est indispensable : agréger en SQL sur le jeu de lignes déjà
      // filtré ne voit ni les dépendances ni les lots répétés, et c'est ce qui produisait
      // des surfaces fausses (un MAX(surface_reelle_bati) au lieu de la somme des locaux
      // principaux). Le regroupement lui-même est fait en JS par agregerMutations(), seule
      // implémentation des règles, testable sans base.
      const query = `
        WITH candidats AS (
          SELECT id_mutation, MAX(date_mutation) AS date_mutation
          FROM transactions
          WHERE ST_DWithin(
            geom::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            $3
          )
          AND nature_mutation IN ('Vente', 'Vente terrain à bâtir')
          AND (
            type_local IN ('Maison', 'Appartement', 'Local industriel. commercial ou assimilé')
            OR
            (type_local IS NULL AND surface_terrain > 0)
          )
          GROUP BY id_mutation
          ORDER BY date_mutation DESC
          LIMIT $4 OFFSET $5
        )
        SELECT t.*
        FROM transactions t
        JOIN candidats c ON c.id_mutation = t.id_mutation
        ORDER BY c.date_mutation DESC, t.id_mutation, t.id;
      `;

      const startTime = Date.now();
      const result = await pool.query(query, [lng, lat, radius, limit, offset]);
      const queryTime = Date.now() - startTime;

      // Log de performance (seulement en développement)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] Requête exécutée en ${queryTime}ms (${result.rows.length} lignes brutes)`);
      }

      return agregerMutations(result.rows).map(toReponseApi);
    },
    [cacheKey],
    {
      revalidate: 3600, // Cache pendant 1 heure
      tags: ['dvf-search']
    }
  );

  return cachedFn();
}

/**
 * Projette une mutation agrégée vers la forme attendue par les consommateurs.
 *
 * Les champs historiques gardent leur nom pour ne rien casser côté site, MCP et export PDF.
 * `surface_reelle_bati` porte désormais la somme des locaux principaux au lieu de la
 * surface d'une seule ligne : même clé, valeur enfin juste.
 */
function toReponseApi(m) {
  return {
    id_mutation: m.id_mutation,
    date_mutation: m.date_mutation,
    valeur_fonciere: m.prix,
    adresse_numero: m.adresse_numero,
    adresse_nom_voie: m.adresse_nom_voie,
    code_postal: m.code_postal,
    nom_commune: m.nom_commune,
    id_parcelle: m.id_parcelle,
    type_local: m.types_locaux.length ? m.types_locaux.join(', ') : 'Terrain',
    nature_mutation: m.nature_mutation,
    surface_reelle_bati: m.surface_bati_totale,
    surface_terrain: m.surface_terrain,
    latitude: m.latitude,
    longitude: m.longitude,
    nombre_pieces_principales: m.nombre_pieces_principales,

    // Nouveaux champs issus du regroupement par mutation
    surface_carrez_m2: m.surface_carrez_totale,
    prix_m2: m.prix_m2,
    prix_m2_carrez: m.prix_m2_carrez,
    nb_locaux_principaux: m.nb_locaux_principaux,
    nb_dependances: m.nb_dependances,
    nb_lignes: m.nb_lignes,
    types_locaux: m.types_locaux,
    parcelles: m.parcelles,
    alertes: m.alertes,
    prix_m2_fiable: m.prix_m2_fiable,
  };
}

// Fonction pour obtenir le nombre total de résultats (pour la pagination)
async function getTotalCount(lat, lng, radius) {
  const cacheKey = `dvf-count-${lat}-${lng}-${radius}`;
  
  const cachedFn = unstable_cache(
    async () => {
      const countQuery = `
        SELECT COUNT(DISTINCT id_mutation) as total
        FROM transactions
        WHERE ST_DWithin(
          geom::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
        AND nature_mutation IN ('Vente', 'Vente terrain à bâtir')
        AND (
          type_local IN ('Maison', 'Appartement', 'Local industriel. commercial ou assimilé')
          OR
          (type_local IS NULL AND surface_terrain > 0)
        );
      `;

      const result = await pool.query(countQuery, [lng, lat, radius]);
      if (!result.rows || result.rows.length === 0 || !result.rows[0] || result.rows[0].total === null || result.rows[0].total === undefined) {
        console.error('[getTotalCount] Unexpected result format:', result);
        return 0;
      }
      return parseInt(result.rows[0].total, 10);
    },
    [cacheKey],
    {
      revalidate: 3600,
      tags: ['dvf-count']
    }
  );
  
  return cachedFn();
}

export async function GET(request) {
  const rl = rateLimiter.check(`search:${getClientIp(request)}`, 60, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes, réessayez dans une minute' }, { status: 429 });
  }

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

  // Pagination (valeurs non numériques → défauts)
  const parsedLimit = parseInt(limitParam || '100', 10);
  const parsedPage = parseInt(pageParam || '1', 10);
  const limit = Math.min(Math.max(isNaN(parsedLimit) ? 100 : parsedLimit, 1), 500); // Max 500 résultats par page
  const page = Math.max(isNaN(parsedPage) ? 1 : parsedPage, 1);
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
        cached: true, // Indique que les données peuvent être en cache
        source: {
          ...DVF_SOURCE,
          label: DVF_SOURCE_LABEL,
        }
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
