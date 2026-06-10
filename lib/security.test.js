import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  validatePassword,
  validateName,
  validateLength,
  rateLimiter,
  sanitizeForLog,
  getClientIp,
} from './security';

describe('isValidEmail', () => {
  it('accepte les emails valides', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('prenom.nom+tag@sous.domaine.fr')).toBe(true);
  });

  it('rejette les emails invalides', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail('pas-un-email')).toBe(false);
    expect(isValidEmail('a@')).toBe(false);
    expect(isValidEmail('@b.com')).toBe(false);
    expect(isValidEmail('a'.repeat(255) + '@x.fr')).toBe(false);
  });

  it("rejette les emails avec retour chariot (anti-injection SMTP)", () => {
    expect(isValidEmail('a@b.com\r\nBCC: evil@x.com')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('accepte un mot de passe conforme', () => {
    expect(validatePassword('Abcdef12').valid).toBe(true);
  });

  it('rejette trop court / sans majuscule / sans chiffre', () => {
    expect(validatePassword('Ab1').valid).toBe(false);
    expect(validatePassword('abcdef12').valid).toBe(false);
    expect(validatePassword('Abcdefgh').valid).toBe(false);
  });

  it('le caractère spécial est recommandé mais pas bloquant', () => {
    const result = validatePassword('Abcdef12');
    expect(result.valid).toBe(true);
    expect(result.errors.some((e) => e.includes('Recommandé'))).toBe(true);
  });
});

describe('validateName', () => {
  it('accepte noms accentués, tirets, apostrophes', () => {
    expect(validateName("Jean-François d'Hérouville").valid).toBe(true);
  });

  it('rejette caractères interdits', () => {
    expect(validateName('Robert<script>').valid).toBe(false);
    expect(validateName('x').valid).toBe(false);
  });
});

describe('validateLength', () => {
  it('borne min/max', () => {
    expect(validateLength('abc', 2, 5).valid).toBe(true);
    expect(validateLength('a', 2, 5).valid).toBe(false);
    expect(validateLength('abcdef', 2, 5).valid).toBe(false);
    expect(validateLength(42, 0, 5).valid).toBe(false);
  });
});

describe('rateLimiter', () => {
  it('bloque au-delà du seuil dans la fenêtre', () => {
    const key = `test:${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimiter.check(key, 5, 60000).allowed).toBe(true);
    }
    expect(rateLimiter.check(key, 5, 60000).allowed).toBe(false);
  });

  it('isole les identifiants entre eux', () => {
    const a = `a:${Date.now()}`;
    const b = `b:${Date.now()}`;
    for (let i = 0; i < 5; i++) rateLimiter.check(a, 5, 60000);
    expect(rateLimiter.check(b, 5, 60000).allowed).toBe(true);
  });
});

describe('sanitizeForLog', () => {
  it('caviarde les clés sensibles', () => {
    const result = sanitizeForLog({
      email: 'a@b.fr',
      password: 'secret',
      authToken: 'xyz',
      sessionId: '123',
    });
    expect(result.email).toBe('a@b.fr');
    expect(result.password).toBe('[REDACTED]');
    expect(result.authToken).toBe('[REDACTED]');
    expect(result.sessionId).toBe('[REDACTED]');
  });
});

describe('getClientIp', () => {
  const fakeRequest = (headers) => ({
    headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  });

  it('prend la première IP de x-forwarded-for', () => {
    expect(getClientIp(fakeRequest({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4');
  });

  it('retombe sur x-real-ip puis unknown', () => {
    expect(getClientIp(fakeRequest({ 'x-real-ip': '5.6.7.8' }))).toBe('5.6.7.8');
    expect(getClientIp(fakeRequest({}))).toBe('unknown');
  });
});
