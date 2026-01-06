import { Pool } from 'pg';

let pool;

export function getPool() {
  if (!pool) {
    // Support de DATABASE_URL en priorité, sinon variables séparées
    let config;

    if (process.env.DATABASE_URL) {
      // Utiliser la chaîne de connexion complète
      // Pour les connexions locales (localhost), SSL est désactivé par défaut
      const isLocalhost = process.env.DATABASE_URL.includes('localhost') || 
                         process.env.DATABASE_URL.includes('127.0.0.1');
      
      config = {
        connectionString: process.env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        // SSL : activé seulement si explicitement demandé ET pas localhost
        ssl: process.env.DB_SSL === 'true' && !isLocalhost 
          ? { rejectUnauthorized: false } 
          : false
      };
    } else {
      // Utiliser les variables d'environnement séparées
      const host = process.env.DB_HOST || 'localhost';
      const user = process.env.DB_USER;
      const password = process.env.DB_PASSWORD;
      const database = process.env.DB_NAME;
      const port = parseInt(process.env.DB_PORT || '5432', 10);

      // Vérification des paramètres requis
      if (!user || !password || !database) {
        throw new Error(
          'Configuration de base de données manquante. ' +
          'Veuillez définir DB_USER, DB_PASSWORD, DB_NAME dans .env.local ' +
          'ou utiliser DATABASE_URL.'
        );
      }

      config = {
        host,
        user,
        password,
        database,
        port,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      };
    }

    pool = new Pool(config);

    // Gestion des erreurs de connexion
    pool.on('error', (err) => {
      console.error('Erreur inattendue sur le pool PostgreSQL:', err);
    });

    // Test de connexion au démarrage (optionnel, pour debug)
    if (process.env.NODE_ENV === 'development') {
      pool.query('SELECT NOW()')
        .then(() => {
          console.log('✅ Connexion PostgreSQL établie avec succès');
        })
        .catch((err) => {
          console.error('❌ Erreur de connexion PostgreSQL:', err.message);
          console.error('Vérifiez vos variables d\'environnement dans .env.local');
        });
    }
  }
  return pool;
}
