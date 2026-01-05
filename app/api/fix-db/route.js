import { Client } from 'pg';
import { NextResponse } from 'next/server';

export async function GET() {
  // On utilise tes identifiants qui fonctionnent
  const client = new Client({
    connectionString: "postgresql://postgres:Maison2026!@51.178.36.210:5432/postgres",
    ssl: false
  });

  try {
    await client.connect();
    
    // Création des index pour la géolocalisation et les dates
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_geom ON transactions USING GIST (geom);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date_mutation);
    `);

    return NextResponse.json({ message: "✅ SUCCÈS ! Les index sont créés. La recherche sera maintenant instantanée." });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await client.end();
  }
}

