// Charger les variables d'environnement (en priorité .env.local, puis .env)
require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // Fallback sur .env si .env.local n'existe pas

/**
 * Script de création de la table users
 * 
 * Usage: node scripts/create_users_table.js
 * 
 * Ce script crée la table 'users' dans la base de données PostgreSQL
 * avec les colonnes nécessaires pour l'authentification.
 */

const { Pool } = require('pg');

async function createUsersTable() {
  console.log('🔍 Connexion à la base de données...\n');

  let pool;
  try {
    // Configuration de la connexion - DATABASE_URL en priorité
    const dbUrl = process.env.DATABASE_URL;
    let config;

    if (dbUrl) {
      // Utiliser DATABASE_URL directement
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
        password: password,
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

    // Création de la table users
    console.log('📝 Création de la table users...');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createTableQuery);
    console.log('✅ Table users créée avec succès !\n');

  } catch (error) {
    console.error('❌ Erreur lors de la création de la table:', error.message);
    if (error.code) {
      console.error('   Code erreur:', error.code);
    }
    process.exit(1);
  } finally {
    // Fermer proprement la connexion
    if (pool) {
      await pool.end();
      console.log('🔌 Connexion fermée');
    }
  }
}

// Exécuter le script
createUsersTable()
  .then(() => {
    console.log('\n✨ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });

