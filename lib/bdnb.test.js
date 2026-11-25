import { describe, it, expect } from 'vitest';
import { resumerBdnb, chargerBdnb } from './bdnb';

const bat = (o) => ({
  millesime: '2026-02.b', annee_construction: null, nb_niveau: null, dpe_classe: null,
  copro_immat: null, copro_nb_lot_tot: null, ...o,
});

describe('resumerBdnb', () => {
  it('renvoie null sans bâtiment', () => {
    expect(resumerBdnb([])).toBeNull();
    expect(resumerBdnb(undefined)).toBeNull();
  });

  it('résume un bâtiment unique en copropriété', () => {
    const r = resumerBdnb([bat({ annee_construction: 1972, nb_niveau: 6, dpe_classe: 'D', copro_immat: 'AA1', copro_nb_lot_tot: 120 })]);
    expect(r.libelle).toBe('1972 · 6 niv. · DPE imm. D · Copro 120 lots');
    expect(r.source).toContain('BDNB 2026-02.b');
    expect(r.source).toContain('pas du lot vendu');
  });

  it('donne une fourchette d’années et tait le DPE quand les bâtiments divergent', () => {
    const r = resumerBdnb([
      bat({ annee_construction: 1965, nb_niveau: 4, dpe_classe: 'E' }),
      bat({ annee_construction: 2015, nb_niveau: 7, dpe_classe: 'B' }),
    ]);
    expect(r.libelle).toBe('1965–2015 · 7 niv.');
    expect(r.dpe_classe).toBeNull();
    expect(r.source).toContain('2 bâtiments sur la parcelle');
  });

  it('ignore les bâtiments sans information (garages, annexes)', () => {
    const r = resumerBdnb([bat({ annee_construction: 1990, nb_niveau: 2, dpe_classe: 'C' }), bat({})]);
    expect(r.libelle).toBe('1990 · 2 niv. · DPE imm. C');
  });

  it('n’annonce pas de nombre de lots quand deux copropriétés partagent la parcelle', () => {
    const r = resumerBdnb([
      bat({ copro_immat: 'AA1', copro_nb_lot_tot: 10 }),
      bat({ copro_immat: 'AA2', copro_nb_lot_tot: 30 }),
    ]);
    expect(r.libelle).toBe('Copro');
  });
});

describe('chargerBdnb', () => {
  it('regroupe par parcelle', async () => {
    const pool = { query: async () => ({ rows: [
      { parcelle_id: 'P1', ...bat({ annee_construction: 1980 }) },
      { parcelle_id: 'P1', ...bat({ annee_construction: 1980 }) },
      { parcelle_id: 'P2', ...bat({}) },
    ] }) };
    const m = await chargerBdnb(pool, ['P1', 'P2', 'P1', null]);
    expect(m.get('P1').libelle).toBe('1980');
    expect(m.has('P2')).toBe(false);
  });

  it('ne casse pas la recherche si les tables BDNB sont absentes', async () => {
    const pool = { query: async () => { throw new Error('relation "bdnb_parcelle" does not exist'); } };
    const m = await chargerBdnb(pool, ['P1']);
    expect(m.size).toBe(0);
  });
});
