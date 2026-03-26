/**
 * Librairie de Sécurité - CaZa DVF
 * Utilitaires pour validation, sanitisation et protection OWASP
 */

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

// ==================== VALIDATION COORDONNÉES GPS ====================

/**
 * Valide des coordonnées latitude/longitude
 * @param {number|string} lat - Latitude
 * @param {number|string} lng - Longitude
 * @returns {{valid: boolean, lat?: number, lng?: number, error?: string}}
 */
export function validateCoordinates(lat, lng) {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  // Vérifier que ce sont des nombres
  if (isNaN(latNum) || isNaN(lngNum)) {
    return { valid: false, error: 'Coordonnées invalides' };
  }

  // Vérifier les limites géographiques
  if (latNum < -90 || latNum > 90) {
    return { valid: false, error: 'Latitude hors limites (-90 à 90)' };
  }

  if (lngNum < -180 || lngNum > 180) {
    return { valid: false, error: 'Longitude hors limites (-180 à 180)' };
  }

  return { valid: true, lat: latNum, lng: lngNum };
}

// ==================== SANITISATION HTML ====================

/**
 * Échappe les caractères HTML dangereux (prévention XSS)
 * @param {string} str - Chaîne à nettoyer
 * @returns {string} - Chaîne nettoyée
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return str.replace(/[&<>"'/]/g, (char) => map[char]);
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
 * Simple rate limiter en mémoire (pour développement)
 * ATTENTION : En production, utiliser Redis ou similaire
 */
class RateLimiter {
  constructor() {
    this.requests = new Map();
  }

  /**
   * Vérifie si une IP a dépassé la limite de requêtes
   * @param {string} identifier - IP ou user ID
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

// Instance globale (en mémoire - à remplacer par Redis en prod)
export const rateLimiter = new RateLimiter();

// ==================== PROTECTION INJECTION SQL ====================

/**
 * Vérifie si une chaîne contient des patterns SQL suspects
 * NOTE : Les requêtes paramétrées ($1, $2) sont la vraie protection
 * Ceci est une couche supplémentaire de défense en profondeur
 * @param {string} input - Input utilisateur
 * @returns {{safe: boolean, reason?: string}}
 */
export function detectSqlInjection(input) {
  if (typeof input !== 'string') return { safe: true };

  // Patterns SQL dangereux
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
    /(--|#|\/\*|\*\/)/g, // Commentaires SQL
    /(\bOR\b.*=.*)/gi, // OR 1=1
    /(\bAND\b.*=.*)/gi, // AND 1=1
    /(;|\||&)/g, // Séparateurs commandes
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(input)) {
      return {
        safe: false,
        reason: 'Pattern SQL suspect détecté'
      };
    }
  }

  return { safe: true };
}

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

// ==================== VALIDATION RADIUS (pour API DVF) ====================

/**
 * Valide un rayon de recherche
 * @param {number|string} radius - Rayon en mètres
 * @param {number} min - Minimum autorisé
 * @param {number} max - Maximum autorisé
 * @returns {{valid: boolean, radius?: number, error?: string}}
 */
export function validateRadius(radius, min = 50, max = 5000) {
  const radiusNum = parseInt(radius, 10);

  if (isNaN(radiusNum)) {
    return { valid: false, error: 'Rayon invalide' };
  }

  if (radiusNum < min) {
    return { valid: false, error: `Rayon minimum : ${min}m` };
  }

  if (radiusNum > max) {
    return { valid: false, error: `Rayon maximum : ${max}m` };
  }

  return { valid: true, radius: radiusNum };
}

// ==================== EXPORTS ====================

export default {
  isValidEmail,
  validatePassword,
  validateCoordinates,
  escapeHtml,
  validateLength,
  validateName,
  rateLimiter,
  detectSqlInjection,
  sanitizeForLog,
  validateRadius
};
