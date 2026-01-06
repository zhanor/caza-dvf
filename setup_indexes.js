/**
 * Script de création des index PostgreSQL pour optimiser les performances
 * 
 * Usage: node setup_indexes.js
 * 
 * Ce script crée les index nécessaires sur la table 'transactions'
 * pour accélérer les recherches géographiques et les filtres.
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function setupIndexes() {
  console.log('🔍 Connexion à la base de données...\n');

  let pool;
  try {
    // Configuration de la connexion
    const dbUrl = process.env.DATABASE_URL;
    let config;

    if (dbUrl) {
      const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
      config = {
        connectionString: dbUrl,
        ssl: process.env.DB_SSL === 'true' && !isLocalhost 
          ? { rejectUnauthorized: false } 
          : false
      };
    } else {
      config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      };
    }

    pool = new Pool(config);

    // Test de connexion
    await pool.query('SELECT NOW()');
    console.log('✅ Connexion établie\n');

    // Liste des index à créer
    const indexes = [
      {
        name: 'idx_transactions_geom_gist',
        sql: `
          CREATE INDEX IF NOT EXISTS idx_transactions_geom_gist 
          ON transactions 
          USING GIST (geom);
        `,
        description: 'Index spatial GIST sur geom (CRITIQUE pour ST_DWithin)'
      },
      {
        name: 'idx_transactions_geom_geography_gist',
        sql: `
          CREATE INDEX IF NOT EXISTS idx_transactions_geom_geography_gist 
          ON transactions 
          USING GIST (geom::geography);
        `,
        description: 'Index GIST sur géographie (pour distances en mètres)'
      },
      {
        name: 'idx_transactions_lat_lng',
        sql: `
          CREATE INDEX IF NOT EXISTS idx_transactions_lat_lng 
          ON transactions (latitude, longitude);
        `,
        description: 'Index composite sur latitude et longitude'
      },
      {
        name: 'idx_transactions_valeur_fonciere',
        sql: `
          CREATE INDEX IF NOT EXISTS idx_transactions_valeur_fonciere 
          ON transactions (valeur_fonciere);
        `,
        description: 'Index sur valeur foncière (pour filtres de prix)'
      },
      {
        name: 'idx_transactions_date_mutation',
        sql: `
          CREATE INDEX IF NOT EXISTS idx_transactions_date_mutation 
          ON transactions (date_mutation DESC);
        `,
        description: 'Index sur date de mutation (pour le tri)'
      },
      {
        name: 'idx_transactions_id_date',
        sql: `
          CREATE INDEX IF NOT EXISTS idx_transactions_id_date 
          ON transactions (id_mutation, date_mutation DESC);
        `,
        description: 'Index composite id_mutation + date (pour GROUP BY + ORDER BY)'
      }
    ];

    console.log('📊 Création des index...\n');

    // Créer chaque index
    for (const index of indexes) {
      try {
        const startTime = Date.now();
        await pool.query(index.sql);
        const duration = Date.now() - startTime;

        console.log(`✅ ${index.name}`);
        console.log(`   ${index.description} (${duration}ms)\n`);
      } catch (error) {
        // Ignorer les erreurs "already exists" (IF NOT EXISTS devrait gérer ça)
        if (error.code === '42P07' || error.message.includes('already exists')) {
          console.log(`ℹ️  ${index.name} (déjà existant)\n`);
        } else {
          console.error(`❌ Erreur pour ${index.name}:`, error.message);
          console.error(`   ${error.code}\n`);
        }
      }
    }

    // Analyser la table pour mettre à jour les statistiques
    try {
      console.log('📈 Mise à jour des statistiques...');
      await pool.query('ANALYZE transactions');
      console.log('✅ Statistiques mises à jour\n');
    } catch (error) {
      console.error('⚠️  Erreur lors de l\'analyse:', error.message);
    }

    console.log('✅ Index créés avec succès');

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error('   Code:', error.code);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Vérifiez que PostgreSQL est démarré');
    } else if (error.code === '28P01') {
      console.error('\n💡 Vérifiez vos identifiants dans .env.local');
    } else if (error.code === '3D000') {
      console.error('\n💡 La base de données n\'existe pas');
    }
    
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Exécuter le script
setupIndexes().catch(console.error);

