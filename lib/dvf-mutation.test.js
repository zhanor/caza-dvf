import { describe, it, expect } from 'vitest';
import { agregerMutation, agregerMutations } from './dvf-mutation';
import fixtures from './dvf-mutation.fixtures.json';

/**
 * Les fixtures sont les lignes DVF brutes, copiées telles quelles depuis la livraison
 * géolocalisée du 20/10/2026 (table transactions_v2), sans retouche.
 *
 * Attention : `id_mutation` n'est PAS stable d'une livraison à l'autre — c'est un compteur
 * réattribué à chaque publication. Les identifiants ci-dessous sont ceux de la livraison du
 * 20/10/2026 ; les mutations sont identifiées de façon durable par adresse + date + prix,
 * rappelés dans chaque `describe`.
 */
const lignes = (id) => fixtures[id];

describe('2025-1370228 — 96 rue de l’Université, Paris 7e, 27/05/2025, 6 777 000 €', () => {
  const m = agregerMutation(lignes('2025-1370228'));

  it('somme les deux appartements au lieu d’en retenir un seul', () => {
    // Le bug historique : MAX(surface_reelle_bati) renvoyait 110 m² et donc 61 609 €/m².
    expect(m.nb_locaux_principaux).toBe(2);
    expect(m.surface_bati_totale).toBe(220);
    expect(m.prix_m2).toBeCloseTo(30804.55, 2);
  });

  it('ne compte le lot 6 qu’une fois dans la Carrez', () => {
    // Le lot 6 (223,75 m²) apparaît sur les deux lignes Appartement et sur une dépendance.
    expect(m.surface_carrez_totale).toBeCloseTo(223.75, 2);
  });

  it('ne somme jamais valeur_fonciere, répétée sur les 5 lignes', () => {
    expect(m.prix).toBe(6777000);
    expect(m.nb_lignes).toBe(5);
  });

  it('signale les 3 dépendances et la pluralité de locaux', () => {
    expect(m.alertes).toContain('DEPENDANCES_INCLUSES(3)');
    expect(m.alertes).toContain('MULTI_LOCAUX');
    expect(m.nb_dependances).toBe(3);
  });

  it('reste fiable : les dépendances seules ne disqualifient pas le prix', () => {
    expect(m.prix_m2_fiable).toBe(true);
  });
});

describe('2024-1251146 — 27 quai Anatole France, Paris 7e, 26/04/2024, 6 250 000 €', () => {
  const m = agregerMutation(lignes('2024-1251146'));

  it('retient les 105 m² du seul appartement, sur 9 lignes', () => {
    expect(m.nb_locaux_principaux).toBe(1);
    expect(m.surface_bati_totale).toBe(105);
    expect(m.nb_lignes).toBe(9);
    expect(m.prix_m2).toBeCloseTo(59523.81, 2);
  });

  it('compte les 8 dépendances', () => {
    expect(m.nb_dependances).toBe(8);
    expect(m.alertes).toContain('DEPENDANCES_INCLUSES(8)');
  });

  it('ne signale plus CARREZ_INCOMPLETE : les 5 lots sont désormais présents', () => {
    // Dans la livraison précédente, seuls 2 des 5 lots étaient renseignés et l'alerte
    // se déclenchait. La livraison du 20/10/2026 liste les 5 lots annoncés.
    expect(m.alertes).not.toContain('CARREZ_INCOMPLETE');
    expect(m.surface_carrez_totale).toBeCloseTo(106.63, 2);
  });

  it('reste fiable malgré ses 8 dépendances', () => {
    expect(m.prix_m2_fiable).toBe(true);
  });
});

describe('2025-1377822 — 11 quai Anatole France, Paris 7e, 30/09/2025, 7 275 000 €', () => {
  const m = agregerMutation(lignes('2025-1377822'));

  it('retient 231 m² et 2 dépendances', () => {
    expect(m.surface_bati_totale).toBe(231);
    expect(m.nb_locaux_principaux).toBe(1);
    expect(m.nb_dependances).toBe(2);
    expect(m.prix_m2).toBeCloseTo(31493.51, 2);
  });

  it('expose la Carrez apparue dans cette livraison (lot 176)', () => {
    // La livraison précédente ne donnait aucune Carrez pour cette mutation.
    expect(m.surface_carrez_totale).toBeCloseTo(228.11, 2);
    expect(m.prix_m2_carrez).toBeCloseTo(31892.51, 2);
  });

  it('n’alerte que sur les dépendances et reste fiable', () => {
    expect(m.alertes).toEqual(['DEPENDANCES_INCLUSES(2)']);
    expect(m.prix_m2_fiable).toBe(true);
  });
});

describe('2025-1361786 — 54 rue Vaneau, Paris 7e, 15/01/2025, 640 000 € (cas simple)', () => {
  const m = agregerMutation(lignes('2025-1361786'));

  it('sort sans aucune alerte', () => {
    expect(m.alertes).toEqual([]);
    expect(m.prix_m2_fiable).toBe(true);
  });

  it('donne le même prix au m² qu’avant le correctif', () => {
    // Une seule ligne, un seul local : MAX() et SUM() coïncident. C'est le garde-fou de
    // non-régression sur l'écrasante majorité des mutations.
    expect(m.nb_lignes).toBe(1);
    expect(m.surface_bati_totale).toBe(62);
    expect(m.prix_m2).toBeCloseTo(10322.58, 2);
  });

  it('calcule aussi le prix au m² Carrez', () => {
    expect(m.surface_carrez_totale).toBeCloseTo(60.76, 2);
    expect(m.prix_m2_carrez).toBeCloseTo(10533.25, 2);
  });
});

describe('règles d’alerte', () => {
  const base = {
    id_mutation: 'X', date_mutation: '2025-01-01', numero_disposition: '000001',
    nature_mutation: 'Vente', valeur_fonciere: '300000', id_parcelle: 'P1',
    type_local: 'Appartement', surface_reelle_bati: '60', nombre_lots: 0,
  };

  it('MULTI_DISPOSITIONS dès que la mutation en compte plusieurs', () => {
    const m = agregerMutation([base, { ...base, numero_disposition: '000002' }]);
    expect(m.alertes).toContain('MULTI_DISPOSITIONS');
    expect(m.prix_m2_fiable).toBe(false);
    // Le prix reste celui d'une ligne, jamais la somme des deux.
    expect(m.prix).toBe(300000);
  });

  it('DOUBLON_POSSIBLE compte quand même les deux lignes identiques', () => {
    const m = agregerMutation([base, { ...base }]);
    expect(m.alertes).toContain('DOUBLON_POSSIBLE');
    expect(m.surface_bati_totale).toBe(120);
  });

  it('TYPES_MIXTES rend le prix non fiable', () => {
    const m = agregerMutation([
      base,
      { ...base, type_local: 'Local industriel. commercial ou assimilé' },
    ]);
    expect(m.alertes).toContain('TYPES_MIXTES');
    expect(m.prix_m2_fiable).toBe(false);
  });

  it('MULTI_PARCELLES quand la mutation porte sur plusieurs parcelles', () => {
    const m = agregerMutation([base, { ...base, id_parcelle: 'P2' }]);
    expect(m.alertes).toContain('MULTI_PARCELLES');
    expect(m.parcelles).toEqual(['P1', 'P2']);
  });

  it('NATURE_NON_VENTE sur une adjudication', () => {
    const m = agregerMutation([{ ...base, nature_mutation: 'Adjudication' }]);
    expect(m.alertes).toContain('NATURE_NON_VENTE');
    expect(m.prix_m2_fiable).toBe(false);
  });

  it('PRIX_SYMBOLIQUE sous 1 000 €/m², seuil paramétrable', () => {
    const m = agregerMutation([{ ...base, valeur_fonciere: '30000' }]);
    expect(m.alertes).toContain('PRIX_SYMBOLIQUE');
    expect(m.prix_m2_fiable).toBe(false);

    const tolerant = agregerMutation([{ ...base, valeur_fonciere: '30000' }], {
      seuilPrixSymbolique: 100,
    });
    expect(tolerant.alertes).not.toContain('PRIX_SYMBOLIQUE');
    expect(tolerant.prix_m2_fiable).toBe(true);
  });

  it('ECART_CARREZ au-delà de 10 % d’écart avec le bâti', () => {
    const m = agregerMutation([
      { ...base, nombre_lots: 1, lot1_numero: '1', lot1_surface_carrez: '40' },
    ]);
    expect(m.alertes).toContain('ECART_CARREZ');
  });

  it('CARREZ_INCOMPLETE quand nombre_lots dépasse les lots lisibles', () => {
    const m = agregerMutation([
      { ...base, nombre_lots: 7, lot1_numero: '1', lot1_surface_carrez: '58' },
    ]);
    expect(m.alertes).toContain('CARREZ_INCOMPLETE');
  });

  it('pas de CARREZ_INCOMPLETE en l’absence totale de Carrez', () => {
    // Sans aucune valeur, il n'y a pas de surface « incomplète », juste pas de Carrez.
    const m = agregerMutation([{ ...base, nombre_lots: 7, lot1_numero: '1' }]);
    expect(m.alertes).not.toContain('CARREZ_INCOMPLETE');
    expect(m.surface_carrez_totale).toBeNull();
  });

  it('la Carrez ignore les lots portés par les dépendances', () => {
    // Une cave de 8 m² Carrez ne fait pas partie de la surface habitable vendue.
    const m = agregerMutation([
      { ...base, nombre_lots: 1, lot1_numero: '1', lot1_surface_carrez: '58' },
      { ...base, type_local: 'Dépendance', surface_reelle_bati: null, nombre_lots: 1, lot1_numero: '9', lot1_surface_carrez: '8' },
    ]);
    expect(m.surface_carrez_totale).toBeCloseTo(58, 2);
  });
});

describe('agregerMutations', () => {
  it('sépare les lignes par id_mutation', () => {
    const toutes = [
      ...lignes('2025-1370228'),
      ...lignes('2025-1361786'),
    ];
    const res = agregerMutations(toutes);
    expect(res).toHaveLength(2);
    expect(res.map((m) => m.id_mutation)).toEqual(['2025-1370228', '2025-1361786']);
    expect(res[0].surface_bati_totale).toBe(220);
    expect(res[1].surface_bati_totale).toBe(62);
  });
});
