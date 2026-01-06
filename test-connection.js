/**
 * Script de test de connexion PostgreSQL
 * 
 * Usage: node test-connection.js
 * 
 * Ce script teste la connexion à la base de données PostgreSQL
 * en utilisant les variables d'environnement du fichier .env.local
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function testConnection() {
  console.log('🔍 Test de connexion PostgreSQL...\n');
  
  // Afficher la configuration (sans le mot de passe complet)
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
    console.log('📋 DATABASE_URL:', maskedUrl);
  } else {
    console.log('📋 Configuration:');
    console.log('   Host:', process.env.DB_HOST || 'localhost');
    console.log('   User:', process.env.DB_USER);
    console.log('   Database:', process.env.DB_NAME);
    console.log('   Port:', process.env.DB_PORT || 5432);
  }
  console.log('');

  let pool;
  try {
    // Créer le pool de connexion
    if (dbUrl) {
      const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
      pool = new Pool({
        connectionString: dbUrl,
        ssl: process.env.DB_SSL === 'true' && !isLocalhost 
          ? { rejectUnauthorized: false } 
          : false
      });
    } else {
      pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      });
    }

    // Test de connexion
    console.log('⏳ Tentative de connexion...');
    const startTime = Date.now();
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    const duration = Date.now() - startTime;

    console.log('✅ Connexion réussie !\n');
    console.log('📊 Informations:');
    console.log('   Temps de connexion:', duration + 'ms');
    console.log('   Heure serveur:', result.rows[0].current_time);
    console.log('   Version PostgreSQL:', result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1]);

    // Test PostGIS si disponible
    try {
      const postgisResult = await pool.query("SELECT PostGIS_version() as postgis_version");
      console.log('   Version PostGIS:', postgisResult.rows[0].postgis_version);
    } catch (err) {
      console.log('   ⚠️  PostGIS non installé (optionnel pour les requêtes spatiales)');
    }

    console.log('\n✅ Tous les tests sont passés avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur de connexion:\n');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Solution: Vérifiez que PostgreSQL est démarré');
    } else if (error.code === '28P01') {
      console.error('\n💡 Solution: Vérifiez le mot de passe dans .env.local');
      console.error('   Le mot de passe doit être encodé en URL si vous utilisez DATABASE_URL');
      console.error('   Exemple: Maison2026! → Maison2026%21');
    } else if (error.code === '3D000') {
      console.error('\n💡 Solution: La base de données n\'existe pas');
      console.error('   Créez-la avec: CREATE DATABASE postgres;');
    }
    
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Exécuter le test
testConnection().catch(console.error);

