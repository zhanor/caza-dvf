// Charger les variables d'environnement (en priorité .env.local, puis .env)
require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // Fallback sur .env si .env.local n'existe pas

/**
 * Script de création des index PostgreSQL pour optimiser les performances
 * 
 * Usage: node setup_indexes.js
 * 
 * Ce script crée les index nécessaires sur la table 'transactions'
 * pour accélérer les recherches géographiques et les filtres.
 */

const { Pool } = require('pg');

async function setupIndexes() {
  console.log('🔍 Connexion à la base de données...\n');

  // Debug : Afficher les variables d'environnement chargées
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  const hasPassword = !!(process.env.DB_PASSWORD || process.env.PGPASSWORD);
  
  console.log('📋 Configuration détectée:');
  console.log('   Tentative de connexion avec :', hasDatabaseUrl ? 'URL trouvée' : 'Aucune URL');
  console.log('   et mot de passe :', hasPassword ? 'Présent' : 'Manquant');
  console.log('');

  let pool;
  try {
    // Configuration de la connexion - DATABASE_URL en priorité
    const dbUrl = process.env.DATABASE_URL;
    let config;

    if (dbUrl) {
      // Utiliser DATABASE_URL directement (le mot de passe est déjà encodé dans l'URL)
      const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
      config = {
        connectionString: dbUrl,
        ssl: process.env.DB_SSL === 'true' && !isLocalhost 
          ? { rejectUnauthorized: false } 
          : false
      };
      console.log('🔗 Utilisation de DATABASE_URL pour la connexion\n');
    } else {
      // Fallback : utiliser les variables séparées
      const host = process.env.DB_HOST || 'localhost';
      const user = process.env.DB_USER;
      // Le mot de passe peut contenir des caractères spéciaux, on le passe tel quel
      const password = process.env.DB_PASSWORD || process.env.PGPASSWORD;
      const database = process.env.DB_NAME;
      const port = parseInt(process.env.DB_PORT || '5432', 10);

      // Vérification des paramètres requis
      if (!user || !password || !database) {
        throw new Error(
          'Configuration de base de données manquante. ' +
          'Veuillez définir DATABASE_URL ou les variables DB_USER, DB_PASSWORD, DB_NAME dans .env.local'
        );
      }

      config = {
        host,
        user,
        password: password, // Passer tel quel, pg gère les caractères spéciaux
        database,
        port,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      };
      console.log('🔗 Utilisation des variables séparées pour la connexion\n');
    }

    pool = new Pool(config);

    // Test de connexion
    console.log('⏳ Test de connexion...');
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
          console.error(`   Code: ${error.code}\n`);
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
      console.error('   Si vous utilisez DATABASE_URL, assurez-vous que le mot de passe est encodé en URL');
      console.error('   Exemple: Maison2026! → Maison2026%21');
    } else if (error.code === '3D000') {
      console.error('\n💡 La base de données n\'existe pas');
    } else if (error.message.includes('password must be a string')) {
      console.error('\n💡 Erreur de mot de passe:');
      console.error('   Vérifiez que DB_PASSWORD est bien défini dans .env.local');
      console.error('   Ou utilisez DATABASE_URL avec le mot de passe encodé en URL');
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
