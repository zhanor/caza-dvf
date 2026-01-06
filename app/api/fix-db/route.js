import { Client } from 'pg';
import { NextResponse } from 'next/server';

export async function GET() {
  // Utiliser les variables d'environnement pour la sécurité
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    return NextResponse.json(
      { error: 'DATABASE_URL non configurée dans les variables d\'environnement' },
      { status: 500 }
    );
  }

  const client = new Client({
    connectionString,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
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

