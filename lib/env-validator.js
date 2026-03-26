/**
 * Validateur de Variables d'Environnement - CaZa DVF
 * Valide les variables d'environnement critiques au démarrage
 * Principe "fail fast" : arrêter l'application si config invalide
 */

/**
 * Variables d'environnement requises avec leurs règles de validation
 */
const REQUIRED_ENV_VARS = {
  DATABASE_URL: {
    required: true,
    validator: (value) => {
      // Doit commencer par postgres:// ou postgresql://
      if (!value.startsWith('postgres://') && !value.startsWith('postgresql://')) {
        return 'DATABASE_URL doit commencer par postgres:// ou postgresql://';
      }
      // Vérifier qu'il contient bien un host
      if (!value.includes('@')) {
        return 'DATABASE_URL doit contenir des credentials (@host)';
      }
      return null; // Valide
    }
  },

  NEXTAUTH_SECRET: {
    required: true,
    validator: (value) => {
      // Doit faire au moins 32 caractères pour être sécurisé
      if (value.length < 32) {
        return 'NEXTAUTH_SECRET doit faire au moins 32 caractères (utiliser: openssl rand -base64 32)';
      }
      // Vérifier qu'il ne contient pas que des caractères répétés (ex: "aaaaaaa...")
      const uniqueChars = new Set(value.split('')).size;
      if (uniqueChars < 10) {
        return 'NEXTAUTH_SECRET trop simple, utilisez une valeur aléatoire';
      }
      return null;
    }
  },

  NEXTAUTH_URL: {
    required: process.env.NODE_ENV === 'production',
    validator: (value) => {
      if (!value) return null; // Pas requis en dev

      // Doit être une URL valide
      try {
        const url = new URL(value);
        // En production, doit être HTTPS
        if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
          return 'NEXTAUTH_URL doit utiliser HTTPS en production';
        }
        return null;
      } catch (error) {
        return 'NEXTAUTH_URL doit être une URL valide (ex: https://example.com)';
      }
    }
  },

  NODE_ENV: {
    required: false,
    validator: (value) => {
      if (!value) return null;

      const validEnvs = ['development', 'production', 'test'];
      if (!validEnvs.includes(value)) {
        return `NODE_ENV doit être: ${validEnvs.join(', ')}`;
      }
      return null;
    }
  }
};

/**
 * Variables d'environnement optionnelles (warnings seulement)
 */
const OPTIONAL_ENV_VARS = {
  PORT: {
    validator: (value) => {
      if (!value) return null;

      const port = parseInt(value, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        return 'PORT doit être un nombre entre 1 et 65535';
      }
      return null;
    }
  }
};

/**
 * Valide une variable d'environnement
 * @param {string} name - Nom de la variable
 * @param {object} config - Configuration de validation
 * @returns {{valid: boolean, error?: string}}
 */
function validateEnvVar(name, config) {
  const value = process.env[name];

  // Vérifier si requis et manquant
  if (config.required && !value) {
    return {
      valid: false,
      error: `❌ Variable requise manquante: ${name}`
    };
  }

  // Si absent mais pas requis, OK
  if (!value) {
    return { valid: true };
  }

  // Valider avec fonction custom si présente
  if (config.validator) {
    const validationError = config.validator(value);
    if (validationError) {
      return {
        valid: false,
        error: `❌ ${name}: ${validationError}`
      };
    }
  }

  return { valid: true };
}

/**
 * Valide toutes les variables d'environnement
 * @param {object} options - Options de validation
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateEnvironment(options = {}) {
  const { throwOnError = true, verbose = true } = options;

  const errors = [];
  const warnings = [];

  // Valider les variables requises
  for (const [name, config] of Object.entries(REQUIRED_ENV_VARS)) {
    const result = validateEnvVar(name, config);
    if (!result.valid) {
      errors.push(result.error);
    } else if (verbose && process.env[name]) {
      console.log(`✅ ${name}: Configuré`);
    }
  }

  // Valider les variables optionnelles (warnings seulement)
  for (const [name, config] of Object.entries(OPTIONAL_ENV_VARS)) {
    const result = validateEnvVar(name, config);
    if (!result.valid) {
      warnings.push(`⚠️  ${name}: ${result.error}`);
    }
  }

  // Afficher les erreurs
  if (errors.length > 0) {
    console.error('\n🚨 ERREURS DE CONFIGURATION:');
    errors.forEach(error => console.error(error));
    console.error('\n💡 Créez un fichier .env avec les variables requises');
    console.error('   Consultez .env.example pour un exemple\n');

    if (throwOnError) {
      throw new Error('Configuration environnement invalide. Corrigez les erreurs ci-dessus.');
    }
  }

  // Afficher les warnings
  if (warnings.length > 0 && verbose) {
    console.warn('\n⚠️  WARNINGS:');
    warnings.forEach(warning => console.warn(warning));
    console.warn('');
  }

  // Afficher succès si tout est OK
  if (errors.length === 0 && verbose) {
    console.log('\n✅ Configuration environnement valide\n');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Vérifie qu'on n'utilise pas de valeurs par défaut dangereuses en production
 */
export function checkProductionSafety() {
  if (process.env.NODE_ENV !== 'production') {
    return { safe: true, warnings: [] };
  }

  const warnings = [];

  // Vérifier que NEXTAUTH_SECRET n'est pas une valeur par défaut
  const dangerousSecrets = [
    'change-this-secret',
    'secret',
    'mysecret',
    'changeme',
    'your-secret-here'
  ];

  const secret = process.env.NEXTAUTH_SECRET?.toLowerCase() || '';
  if (dangerousSecrets.some(dangerous => secret.includes(dangerous))) {
    warnings.push('⚠️  NEXTAUTH_SECRET semble être une valeur par défaut ! Changez-la immédiatement.');
  }

  // Vérifier que DATABASE_URL n'utilise pas localhost en production
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
    warnings.push('⚠️  DATABASE_URL pointe vers localhost en production. Est-ce intentionnel ?');
  }

  if (warnings.length > 0) {
    console.warn('\n🔒 WARNINGS DE SÉCURITÉ PRODUCTION:');
    warnings.forEach(w => console.warn(w));
    console.warn('');
  }

  return {
    safe: warnings.length === 0,
    warnings
  };
}

/**
 * Génère un NEXTAUTH_SECRET sécurisé (helper)
 * @returns {string} - Secret généré
 */
export function generateSecureSecret() {
  if (typeof window !== 'undefined') {
    throw new Error('Ne pas générer de secrets côté client !');
  }

  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Affiche un résumé de la configuration (sans valeurs sensibles)
 */
export function printConfig() {
  console.log('\n📋 CONFIGURATION ENVIRONNEMENT:\n');

  const mask = (value) => {
    if (!value) return '❌ Non configuré';
    if (value.length <= 8) return '***';
    return value.substring(0, 4) + '***' + value.substring(value.length - 4);
  };

  console.log('  NODE_ENV:', process.env.NODE_ENV || 'development');
  console.log('  DATABASE_URL:', mask(process.env.DATABASE_URL));
  console.log('  NEXTAUTH_SECRET:', mask(process.env.NEXTAUTH_SECRET));
  console.log('  NEXTAUTH_URL:', process.env.NEXTAUTH_URL || 'Auto (dev)');
  console.log('  PORT:', process.env.PORT || '3000 (default)');
  console.log('');
}

// Validation automatique au chargement du module
// Peut être désactivée en définissant SKIP_ENV_VALIDATION=true
if (process.env.SKIP_ENV_VALIDATION !== 'true' && typeof window === 'undefined') {
  // Seulement côté serveur
  try {
    validateEnvironment({ verbose: process.env.NODE_ENV === 'development' });

    if (process.env.NODE_ENV === 'production') {
      checkProductionSafety();
    }
  } catch (error) {
    // L'erreur est déjà loggée, on la relance
    throw error;
  }
}

export default {
  validateEnvironment,
  checkProductionSafety,
  generateSecureSecret,
  printConfig
};
