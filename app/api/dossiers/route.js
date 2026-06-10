import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { rateLimiter, getClientIp } from '@/lib/security';
import { getUserId, validateComparables, insertComparables } from '@/lib/dossiers';

// GET /api/dossiers — liste des dossiers de l'utilisateur
export async function GET(request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const result = await pool.query(
      `SELECT d.id, d.nom, d.adresse_bien, d.radius, d.statut, d.created_at, d.updated_at,
              COUNT(c.id) FILTER (WHERE c.statut = 'retenu') AS nb_retenus,
              COUNT(c.id) AS nb_total
       FROM dossiers d
       LEFT JOIN dossier_comparables c ON c.dossier_id = d.id
       WHERE d.user_id = $1
       GROUP BY d.id
       ORDER BY d.updated_at DESC
       LIMIT 200`,
      [userId]
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Erreur GET dossiers:', error);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// POST /api/dossiers — créer un dossier avec ses comparables
export async function POST(request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const rl = rateLimiter.check(`dossiers:${getClientIp(request)}`, 30, 60000);
    if (!rl.allowed) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 });

    const body = await request.json();
    const { nom, adresse_bien, lat, lng, radius, filtres, comparables = [] } = body;

    if (!nom || typeof nom !== 'string' || nom.trim().length < 1 || nom.length > 200) {
      return NextResponse.json({ error: 'Nom de dossier requis (max 200 caractères)' }, { status: 400 });
    }
    const compError = validateComparables(comparables);
    if (compError) return NextResponse.json({ error: compError }, { status: 400 });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO dossiers (user_id, nom, adresse_bien, lat, lng, radius, filtres)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, nom, adresse_bien, radius, statut, created_at, updated_at`,
        [userId, nom.trim(), adresse_bien || null, lat ?? null, lng ?? null, radius ?? 500, JSON.stringify(filtres || {})]
      );
      const dossier = result.rows[0];
      await insertComparables(client, dossier.id, comparables);
      await client.query('COMMIT');
      return NextResponse.json({ success: true, dossier }, { status: 201 });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erreur POST dossier:', error);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
