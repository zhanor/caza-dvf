import { describe, it, expect } from 'vitest';
import { getQuarterKey, needsActualization, actualiserPrixICC } from './icc';

// Fixture de test — indépendante des vraies valeurs INSEE (récupérées en direct en prod via /api/icc)
const TEST_SERIES = {
  '2022-T1': 1951,
  '2025-T4': 2058,
};
const TEST_LATEST = { quarter: 'T4 2025', value: 2058 };

describe('getQuarterKey', () => {
  it('calcule le trimestre depuis une Date', () => {
    expect(getQuarterKey(new Date('2022-01-15'))).toBe('2022-T1');
    expect(getQuarterKey(new Date('2022-03-31'))).toBe('2022-T1');
    expect(getQuarterKey(new Date('2022-04-01'))).toBe('2022-T2');
    expect(getQuarterKey(new Date('2022-12-25'))).toBe('2022-T4');
  });

  it('accepte une chaîne de date', () => {
    expect(getQuarterKey('2023-07-10')).toBe('2023-T3');
  });
});

describe('needsActualization', () => {
  it('vraie pour une vente de plus de 2 ans', () => {
    const old = new Date();
    old.setFullYear(old.getFullYear() - 3);
    expect(needsActualization(old)).toBe(true);
  });

  it('fausse pour une vente récente', () => {
    const recent = new Date();
    recent.setMonth(recent.getMonth() - 6);
    expect(needsActualization(recent)).toBe(false);
  });
});

describe('actualiserPrixICC', () => {
  it('actualise un prix de 2022-T1 (ICC 1951) vers le dernier indice', () => {
    const result = actualiserPrixICC(100000, new Date('2022-02-15'), TEST_SERIES, TEST_LATEST);
    expect(result).not.toBeNull();
    expect(result.iccVente).toBe(1951);
    expect(result.prixActualise).toBe(Math.round(100000 * (TEST_LATEST.value / 1951)));
    expect(result.coefficient).toBeCloseTo(TEST_LATEST.value / 1951, 3);
    expect(result.quarterVente).toBe('2022 T1');
  });

  it("retourne null si le trimestre n'est pas dans la série fournie", () => {
    expect(actualiserPrixICC(100000, new Date('2010-06-01'), TEST_SERIES, TEST_LATEST)).toBeNull();
  });

  it('retourne null si le prix est nul ou absent', () => {
    expect(actualiserPrixICC(0, new Date('2022-02-15'), TEST_SERIES, TEST_LATEST)).toBeNull();
    expect(actualiserPrixICC(null, new Date('2022-02-15'), TEST_SERIES, TEST_LATEST)).toBeNull();
  });

  it('retourne null si la série ou le dernier indice ne sont pas encore chargés', () => {
    expect(actualiserPrixICC(100000, new Date('2022-02-15'), null, null)).toBeNull();
  });

  it('un prix au dernier trimestre de la série garde un coefficient de 1', () => {
    const result = actualiserPrixICC(250000, new Date('2025-11-15'), TEST_SERIES, TEST_LATEST);
    expect(result).not.toBeNull();
    expect(result.coefficient).toBe(1);
    expect(result.prixActualise).toBe(250000);
  });
});
