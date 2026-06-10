/**
 * Librairie de Sécurité - CaZa DVF
 * Validation des inputs, rate limiting et logging sécurisé
 */

// ==================== IP CLIENT ====================

/**
 * Extrait l'IP cliente depuis les headers du reverse proxy (nginx)
 * @param {Request} request - Requête Next.js
 * @returns {string} - IP cliente ou 'unknown'
 */
export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

// ==================== VALIDATION EMAIL ====================

/**
 * Valide un email selon RFC 5322 (simplifié)
 * @param {string} email - Email à valider
 * @returns {boolean} - true si valide
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;

  // Regex simplifié mais robuste pour emails
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  // Vérifications supplémentaires
  if (email.length > 254) return false; // RFC 5321
  if (!emailRegex.test(email)) return false;

  // Vérifier que le domaine n'est pas vide
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return false;
  if (localPart.length > 64) return false; // RFC 5321

  return true;
}

// ==================== VALIDATION MOT DE PASSE ====================

/**
 * Valide la force d'un mot de passe
 * Règles : min 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre
 * @param {string} password - Mot de passe à valider
 * @returns {{valid: boolean, errors: string[]}} - Résultat validation
 */
export function validatePassword(password) {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Mot de passe requis'] };
  }

  // Longueur minimum
  if (password.length < 8) {
    errors.push('Minimum 8 caractères');
  }

  // Maximum pour éviter DoS
  if (password.length > 128) {
    errors.push('Maximum 128 caractères');
  }

  // Au moins une majuscule
  if (!/[A-Z]/.test(password)) {
    errors.push('Au moins une lettre majuscule');
  }

  // Au moins une minuscule
  if (!/[a-z]/.test(password)) {
    errors.push('Au moins une lettre minuscule');
  }

  // Au moins un chiffre
  if (!/[0-9]/.test(password)) {
    errors.push('Au moins un chiffre');
  }

  // Bonus : caractère spécial (optionnel mais recommandé)
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Recommandé : au moins un caractère spécial');
  }

  return {
    valid: errors.filter(e => !e.includes('Recommandé')).length === 0,
    errors
  };
}

// ==================== VALIDATION LONGUEUR INPUTS ====================

/**
 * Valide la longueur d'une chaîne
 * @param {string} str - Chaîne à valider
 * @param {number} min - Longueur minimum
 * @param {number} max - Longueur maximum
 * @returns {{valid: boolean, error?: string}}
 */
export function validateLength(str, min = 0, max = Infinity) {
  if (typeof str !== 'string') {
    return { valid: false, error: 'Doit être une chaîne de caractères' };
  }

  if (str.length < min) {
    return { valid: false, error: `Minimum ${min} caractères` };
  }

  if (str.length > max) {
    return { valid: false, error: `Maximum ${max} caractères` };
  }

  return { valid: true };
}

// ==================== VALIDATION NOM/PRÉNOM ====================

/**
 * Valide un nom ou prénom
 * Autorise lettres, espaces, traits d'union, apostrophes
 * @param {string} name - Nom à valider
 * @returns {{valid: boolean, error?: string}}
 */
export function validateName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Nom requis' };
  }

  // Longueur
  if (name.length < 2 || name.length > 100) {
    return { valid: false, error: 'Nom entre 2 et 100 caractères' };
  }

  // Caractères autorisés : lettres (avec accents), espaces, tirets, apostrophes
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
  if (!nameRegex.test(name)) {
    return { valid: false, error: 'Caractères invalides dans le nom' };
  }

  return { valid: true };
}

// ==================== RATE LIMITING (Helper pour API) ====================

/**
 * Simple rate limiter en mémoire.
 * Suffisant pour un déploiement mono-process (PM2 fork) ; le compteur
 * est remis à zéro au restart. Passer à Redis si multi-process un jour.
 */
class RateLimiter {
  constructor() {
    this.requests = new Map();
  }

  /**
   * Vérifie si un identifiant a dépassé la limite de requêtes
   * @param {string} identifier - IP ou user ID (préfixé par route, ex: "search:1.2.3.4")
   * @param {number} maxRequests - Nombre max de requêtes
   * @param {number} windowMs - Fenêtre temporelle en ms
   * @returns {{allowed: boolean, remaining: number, resetAt: number}}
   */
  check(identifier, maxRequests = 100, windowMs = 60000) {
    const now = Date.now();
    const record = this.requests.get(identifier) || { count: 0, resetAt: now + windowMs };

    // Reset si fenêtre expirée
    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }

    // Incrémenter
    record.count++;
    this.requests.set(identifier, record);

    // Nettoyage périodique (éviter fuite mémoire)
    if (this.requests.size > 10000) {
      this.cleanup();
    }

    return {
      allowed: record.count <= maxRequests,
      remaining: Math.max(0, maxRequests - record.count),
      resetAt: record.resetAt
    };
  }

  /**
   * Nettoie les entrées expirées
   */
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.requests.entries()) {
      if (now > value.resetAt) {
        this.requests.delete(key);
      }
    }
  }
}

// Instance globale (en mémoire)
export const rateLimiter = new RateLimiter();

// ==================== LOG SÉCURISÉ ====================

/**
 * Nettoie les données sensibles avant logging
 * @param {object} data - Données à logger
 * @returns {object} - Données nettoyées
 */
export function sanitizeForLog(data) {
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apikey',
    'authorization',
    'cookie',
    'session'
  ];

  const sanitized = { ...data };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}
