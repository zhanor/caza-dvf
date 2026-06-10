import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    const adminCheck = await pool.query(
      'SELECT is_admin FROM users WHERE email = $1',
      [session.user.email]
    );
    if (!adminCheck.rows[0]?.is_admin) {
      return NextResponse.json({ error: 'Accès admin requis' }, { status: 403 });
    }

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_geom ON transactions USING GIST (geom);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date_mutation);
    `);
    return NextResponse.json({ message: 'Index créés avec succès.' });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
