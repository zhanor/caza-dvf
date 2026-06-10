import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { rateLimiter, getClientIp } from '@/lib/security';
import { getUserId, validateComparables, insertComparables } from '@/lib/dossiers';

function parseDossierId(params) {
  const id = parseInt(params.id, 10);
  return Number.isNaN(id) || id < 1 ? null : id;
}

/** Vérifie que le dossier appartient à l'utilisateur. Retourne la ligne ou null. */
async function getOwnedDossier(dossierId, userId, client = pool) {
  const result = await client.query(
    'SELECT id, nom, adresse_bien, lat, lng, radius, filtres, statut, created_at, updated_at FROM dossiers WHERE id = $1 AND user_id = $2',
    [dossierId, userId]
  );
  return result.rows[0] || null;
}

// GET /api/dossiers/[id] — dossier complet avec comparables
export async function GET(request, { params }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const dossierId = parseDossierId(params);
    if (!dossierId) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });

    const dossier = await getOwnedDossier(dossierId, userId);
    if (!dossier) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });

    const comparables = await pool.query(
      'SELECT id_mutation, statut, note, snapshot FROM dossier_comparables WHERE dossier_id = $1',
      [dossierId]
    );
    return NextResponse.json({ ...dossier, comparables: comparables.rows });
  } catch (error) {
    console.error('Erreur GET dossier:', error);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// PUT /api/dossiers/[id] — mise à jour complète (état de la recherche + comparables)
export async function PUT(request, { params }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const rl = rateLimiter.check(`dossiers:${getClientIp(request)}`, 30, 60000);
    if (!rl.allowed) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 });

    const dossierId = parseDossierId(params);
    if (!dossierId) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });

    const body = await request.json();
    const { nom, adresse_bien, lat, lng, radius, filtres, statut, comparables } = body;

    if (nom !== undefined && (!nom || typeof nom !== 'string' || nom.length > 200)) {
      return NextResponse.json({ error: 'Nom invalide' }, { status: 400 });
    }
    if (statut !== undefined && !['en_cours', 'termine'].includes(statut)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
    }
    if (comparables !== undefined) {
      const compError = validateComparables(comparables);
      if (compError) return NextResponse.json({ error: compError }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const dossier = await getOwnedDossier(dossierId, userId, client);
      if (!dossier) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
      }

      await client.query(
        `UPDATE dossiers SET
           nom = COALESCE($1, nom),
           adresse_bien = COALESCE($2, adresse_bien),
           lat = COALESCE($3, lat),
           lng = COALESCE($4, lng),
           radius = COALESCE($5, radius),
           filtres = COALESCE($6, filtres),
           statut = COALESCE($7, statut),
           updated_at = NOW()
         WHERE id = $8`,
        [
          nom?.trim() ?? null,
          adresse_bien ?? null,
          lat ?? null,
          lng ?? null,
          radius ?? null,
          filtres !== undefined ? JSON.stringify(filtres) : null,
          statut ?? null,
          dossierId,
        ]
      );

      if (comparables !== undefined) {
        // Remplacement complet : l'état sauvegardé reflète exactement l'écran
        await client.query('DELETE FROM dossier_comparables WHERE dossier_id = $1', [dossierId]);
        await insertComparables(client, dossierId, comparables);
      }

      await client.query('COMMIT');
      return NextResponse.json({ success: true });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erreur PUT dossier:', error);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// DELETE /api/dossiers/[id]
export async function DELETE(request, { params }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const dossierId = parseDossierId(params);
    if (!dossierId) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });

    const result = await pool.query(
      'DELETE FROM dossiers WHERE id = $1 AND user_id = $2 RETURNING id',
      [dossierId, userId]
    );
    if (result.rowCount === 0) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur DELETE dossier:', error);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
