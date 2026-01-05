import { Client } from 'pg';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radiusParam = searchParams.get('radius');
  const radius = radiusParam ? parseInt(radiusParam, 10) : 500; // Rayon par défaut 500m

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Coordonnées manquantes' }, { status: 400 });
  }

  // Connexion au VPS
  const client = new Client({
    connectionString: "postgresql://postgres:Maison2026!@51.178.36.210:5432/postgres",
    ssl: false
  });

  try {
    await client.connect();

    // Requête optimisée (Groupée par vente)
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
        -- Si type_local est NULL mais qu'il y a du terrain, on l'appelle 'Terrain'
        COALESCE(STRING_AGG(DISTINCT type_local, ', '), 'Terrain') as type_local,
        SUM(surface_reelle_bati) as surface_reelle_bati, 
        MAX(surface_terrain) as surface_terrain,
        MAX(latitude) as latitude,
        MAX(longitude) as longitude
      FROM transactions
      WHERE ST_DWithin(
        geom,
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
      LIMIT 100;
    `;

    const result = await client.query(query, [lng, lat, radius]);
    await client.end();

    return NextResponse.json(result.rows);

  } catch (error) {
    console.error('Erreur API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
