import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Création des index pour la géolocalisation et les dates
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_geom ON transactions USING GIST (geom);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date_mutation);
    `);

    return NextResponse.json({ message: "✅ SUCCÈS ! Les index sont créés. La recherche sera maintenant instantanée." });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

