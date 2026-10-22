import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { rateLimiter, getClientIp } from '@/lib/security';
import { agregerMutation } from '@/lib/dvf-mutation';

/**
 * Lignes DVF brutes d'une mutation, pour le lien « voir les lignes brutes ».
 *
 * L'intérêt est de pouvoir justifier une surface ou une alerte dans un rapport d'expertise :
 * on montre les lignes telles qu'elles sortent du fichier DVF, sans retraitement, à côté du
 * résultat agrégé.
 */
export async function GET(request, { params }) {
  const rl = rateLimiter.check(`mutation:${getClientIp(request)}`, 60, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes, réessayez dans une minute' }, { status: 429 });
  }

  const id = params?.id;
  // Les id_mutation DVF sont de la forme "2025-1370228".
  if (!id || !/^\d{4}-\d+$/.test(id)) {
    return NextResponse.json({ error: 'Identifiant de mutation invalide' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id_mutation, date_mutation, numero_disposition, nature_mutation, valeur_fonciere,
              adresse_numero, adresse_suffixe, adresse_nom_voie, code_postal, nom_commune,
              id_parcelle, numero_volume,
              lot1_numero, lot1_surface_carrez, lot2_numero, lot2_surface_carrez,
              lot3_numero, lot3_surface_carrez, lot4_numero, lot4_surface_carrez,
              lot5_numero, lot5_surface_carrez, nombre_lots,
              type_local, surface_reelle_bati, nombre_pieces_principales,
              nature_culture, surface_terrain, longitude, latitude
       FROM transactions
       WHERE id_mutation = $1
       ORDER BY type_local NULLS LAST, id`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Mutation introuvable' }, { status: 404 });
    }

    return NextResponse.json({
      id_mutation: id,
      lignes: rows,
      agregat: agregerMutation(rows),
    });
  } catch (error) {
    console.error('[API Error /api/mutation]', { id, message: error.message });
    return NextResponse.json({ error: 'Erreur lors de la récupération des lignes' }, { status: 500 });
  }
}
