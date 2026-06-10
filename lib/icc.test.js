import { describe, it, expect } from 'vitest';
import { getQuarterKey, needsActualization, actualiserPrixICC, ICC_LATEST } from './icc';

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
    const result = actualiserPrixICC(100000, new Date('2022-02-15'));
    expect(result).not.toBeNull();
    expect(result.iccVente).toBe(1951);
    expect(result.prixActualise).toBe(Math.round(100000 * (ICC_LATEST.value / 1951)));
    expect(result.coefficient).toBeCloseTo(ICC_LATEST.value / 1951, 3);
    expect(result.quarterVente).toBe('2022 T1');
  });

  it("retourne null si le trimestre n'est pas dans la table ICC", () => {
    expect(actualiserPrixICC(100000, new Date('2010-06-01'))).toBeNull();
  });

  it('retourne null si le prix est nul ou absent', () => {
    expect(actualiserPrixICC(0, new Date('2022-02-15'))).toBeNull();
    expect(actualiserPrixICC(null, new Date('2022-02-15'))).toBeNull();
  });

  it("un prix récent au dernier trimestre garde un coefficient de 1", () => {
    // Le dernier trimestre de la table doit donner coefficient 1 (prix inchangé)
    const result = actualiserPrixICC(250000, new Date('2025-11-15'));
    expect(result).not.toBeNull();
    expect(result.coefficient).toBe(1);
    expect(result.prixActualise).toBe(250000);
  });
});
