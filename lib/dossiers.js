/**
 * Helpers partagés des routes /api/dossiers
 */
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const MAX_COMPARABLES = 500;
export const VALID_STATUTS = ['retenu', 'ecarte', 'exclu'];

/** Récupère l'id utilisateur (integer) de la session, ou null */
export async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const id = parseInt(session.user.id, 10);
  return Number.isNaN(id) ? null : id;
}

/** Valide le tableau de comparables d'un payload. Retourne un message d'erreur ou null. */
export function validateComparables(comparables) {
  if (!Array.isArray(comparables)) return 'comparables doit être un tableau';
  if (comparables.length > MAX_COMPARABLES) return `Maximum ${MAX_COMPARABLES} comparables par dossier`;
  for (const c of comparables) {
    if (!c.id_mutation || typeof c.id_mutation !== 'string') return 'id_mutation manquant';
    if (!VALID_STATUTS.includes(c.statut)) return `statut invalide (${VALID_STATUTS.join('|')})`;
    if (c.note != null && (typeof c.note !== 'string' || c.note.length > 2000)) return 'note invalide (max 2000 caractères)';
    if (!c.snapshot || typeof c.snapshot !== 'object') return 'snapshot manquant';
  }
  return null;
}

/** Upsert les comparables d'un dossier (à appeler dans une transaction) */
export async function insertComparables(client, dossierId, comparables) {
  for (const c of comparables) {
    await client.query(
      `INSERT INTO dossier_comparables (dossier_id, id_mutation, statut, note, snapshot)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (dossier_id, id_mutation) DO UPDATE SET statut = $3, note = $4, snapshot = $5`,
      [dossierId, c.id_mutation, c.statut, c.note || null, JSON.stringify(c.snapshot)]
    );
  }
}
