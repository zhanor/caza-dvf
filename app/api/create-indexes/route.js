import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

/**
 * Route API pour créer automatiquement les index PostgreSQL
 * 
 * GET /api/create-indexes
 * 
 * Cette route exécute les commandes SQL pour créer tous les index
 * nécessaires à l'optimisation des performances de la table transactions.
 * 
 * ⚠️ ATTENTION : Cette opération peut prendre plusieurs minutes sur de grandes tables.
 */
export async function GET(request) {
  // Vérification de sécurité : seulement en développement ou avec une clé secrète
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.INDEX_CREATION_TOKEN || 'dev-only';
  
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json(
      { error: 'Non autorisé. Utilisez un token d\'autorisation en production.' },
      { status: 401 }
    );
  }

  const pool = getPool();

  // Liste des index à créer (ordre d'importance) - Syntaxe PostgreSQL/PostGIS
  const indexes = [
    {
      name: 'idx_transactions_geom_gist',
      sql: 'CREATE INDEX IF NOT EXISTS idx_transactions_geom_gist ON transactions USING GIST (geom)',
      description: 'Index spatial GIST pour ST_DWithin (CRITIQUE)'
    },
    {
      name: 'idx_transactions_geom_geography_gist',
      sql: 'CREATE INDEX IF NOT EXISTS idx_transactions_geom_geography_gist ON transactions USING GIST (geom::geography)',
      description: 'Index GIST sur géographie (pour distances en mètres)'
    },
    {
      name: 'idx_transactions_code_postal',
      sql: 'CREATE INDEX IF NOT EXISTS idx_transactions_code_postal ON transactions (code_postal)',
      description: 'Index sur code postal'
    },
    {
      name: 'idx_transactions_nom_commune',
      sql: 'CREATE INDEX IF NOT EXISTS idx_transactions_nom_commune ON transactions (nom_commune)',
      description: 'Index sur nom de commune'
    },
    {
      name: 'idx_transactions_code_commune',
      sql: 'CREATE INDEX IF NOT EXISTS idx_transactions_code_commune ON transactions (code_postal, nom_commune)',
      description: 'Index composite code postal + commune'
    },
    {
      name: 'idx_transactions_type_local',
      sql: 'CREATE INDEX IF NOT EXISTS idx_transactions_type_local ON transactions (type_local) WHERE type_local IS NOT NULL',
      description: 'Index partiel sur type de local (filtrage)'
    },
    {
      name: 'idx_transactions_type_surface',
      sql: 'CREATE INDEX IF NOT EXISTS idx_transactions_type_surface ON transactions (type_local, surface_terrain)',
      description: 'Index composite type + surface'
    },
    {
      name: 'idx_transactions_date_mutation',
      sql: 'CREATE INDEX IF NOT EXISTS idx_transactions_date_mutation ON transactions (date_mutation DESC)',
      description: 'Index sur date de mutation (tri)'
    },
    {
      name: 'idx_transactions_id_date',
      sql: 'CREATE INDEX IF NOT EXISTS idx_transactions_id_date ON transactions (id_mutation, date_mutation DESC)',
      description: 'Index composite id_mutation + date'
    },
    {
      name: 'idx_transactions_valeur_fonciere',
      sql: 'CREATE INDEX IF NOT EXISTS idx_transactions_valeur_fonciere ON transactions (valeur_fonciere)',
      description: 'Index sur valeur foncière (prix)'
    },
    {
      name: 'idx_transactions_prix_date',
      sql: 'CREATE INDEX IF NOT EXISTS idx_transactions_prix_date ON transactions (valeur_fonciere DESC, date_mutation DESC)',
      description: 'Index composite prix + date'
    },
    {
      name: 'idx_transactions_surface_terrain',
      sql: 'CREATE INDEX IF NOT EXISTS idx_transactions_surface_terrain ON transactions (surface_terrain) WHERE type_local IS NULL AND surface_terrain > 0',
      description: 'Index partiel sur surface terrain (pour terrains)'
    },
    {
      name: 'idx_transactions_terrain_null',
      sql: 'CREATE INDEX IF NOT EXISTS idx_transactions_terrain_null ON transactions (type_local, surface_terrain)',
      description: 'Index composite pour terrains'
    },
    {
      name: 'idx_transactions_composite',
      sql: 'CREATE INDEX IF NOT EXISTS idx_transactions_composite ON transactions (type_local, date_mutation DESC, valeur_fonciere)',
      description: 'Index composite optimisé'
    }
  ];

  const results = [];
  const errors = [];

  try {
    // Exécuter chaque index
    for (const index of indexes) {
      try {
        const startTime = Date.now();
        await pool.query(index.sql);
        const duration = Date.now() - startTime;

        results.push({
          index: index.name,
          status: 'created',
          duration: `${duration}ms`,
          description: index.description
        });

        console.log(`✅ Index créé : ${index.name} (${duration}ms)`);
      } catch (error) {
        // Ignorer les erreurs "index already exists" (IF NOT EXISTS devrait gérer ça, mais au cas où)
        if (error.code === '42P07' || error.message.includes('already exists') || error.message.includes('duplicate')) {
          results.push({
            index: index.name,
            status: 'already_exists',
            message: 'Index déjà existant',
            description: index.description
          });
        } else {
          errors.push({
            index: index.name,
            error: error.message,
            code: error.code,
            description: index.description
          });
          
          console.error(`❌ Erreur pour l'index ${index.name}:`, error.message);
        }
      }
    }

    // Exécuter ANALYZE (PostgreSQL)
    try {
      await pool.query('ANALYZE transactions');
      results.push({
        index: 'ANALYZE',
        status: 'completed',
        message: 'Statistiques mises à jour'
      });
    } catch (error) {
      errors.push({
        index: 'ANALYZE',
        error: error.message
      });
    }

    return NextResponse.json({
      success: true,
      message: `Création des index terminée. ${results.length} index traités.`,
      results: {
        created: results.filter(r => r.status === 'created').length,
        alreadyExists: results.filter(r => r.status === 'already_exists').length,
        errors: errors.length
      },
      details: {
        successful: results,
        errors: errors.length > 0 ? errors : undefined
      },
      note: errors.length > 0 
        ? 'Certains index n\'ont pas pu être créés. Vérifiez les erreurs ci-dessus.'
        : 'Tous les index ont été créés avec succès. Les performances devraient être améliorées.'
    });

  } catch (error) {
    console.error('[Create Indexes Error]', {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    return NextResponse.json(
      { 
        error: 'Erreur lors de la création des index',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
        code: error.code
      },
      { status: 500 }
    );
  }
}

