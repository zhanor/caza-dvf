/**
 * Indices de prix immobiliers — national, régional (Notaires-INSEE) et local (calculé depuis nos données DVF)
 *
 * Sources :
 * - National / régional : Indices Notaires-INSEE des prix des logements anciens, via l'API BDM (SDMX), gratuite et sans clé.
 * - Local : moyenne des prix/m² par département, calculée directement depuis nos 24M+ transactions DVF.
 */

const BDM_URL = 'https://www.bdm.insee.fr/series/sdmx/data/SERIES_BDM';

// Idbank national — "France (hors Mayotte) - Ensemble - Série CVS - Base 100 en moyenne annuelle 2015"
// (série la plus récente/complète des indices Notaires-INSEE, méthodologie révisée mai 2025)
const NATIONAL_IDBANK = '010567119';

// Régions disposant d'un indice Notaires-INSEE dédié (les autres départements retombent sur "Province")
const REGIONS = {
  IDF:  { label: 'Île-de-France',                     idbank: '010567079' },
  ARA:  { label: 'Auvergne-Rhône-Alpes',               idbank: '010567131' },
  HDF:  { label: 'Hauts-de-France',                    idbank: '010567125' },
  PACA: { label: "Provence-Alpes-Côte d'Azur",         idbank: '010567113' },
};
const PROVINCE = { label: 'Province (France hors Île-de-France)', idbank: '010567073' };

const DEPT_TO_REGION = {
  IDF:  ['75', '77', '78', '91', '92', '93', '94', '95'],
  ARA:  ['01', '03', '07', '15', '26', '38', '42', '43', '63', '69', '73', '74'],
  HDF:  ['02', '59', '60', '62', '80'],
  PACA: ['04', '05', '06', '13', '83', '84'],
};

// Séries départementales plus fines, quand elles existent (Île-de-France + Paris)
const DEPT_OVERRIDES = {
  '75': { label: 'Paris', idbank: '010567013' }, // Paris n'a qu'une série "Appartements" (marché quasi exclusivement collectif)
  '77': { label: 'Seine-et-Marne',    idbank: '010567017' },
  '78': { label: 'Yvelines',          idbank: '010567023' },
  '91': { label: 'Essonne',           idbank: '010567029' },
  '92': { label: 'Hauts-de-Seine',    idbank: '010567035' },
  '93': { label: 'Seine-Saint-Denis', idbank: '010567041' },
  '94': { label: 'Val-de-Marne',      idbank: '010567047' },
  '95': { label: "Val-d'Oise",        idbank: '010567053' },
};

/** Détermine la série régionale/départementale Notaires-INSEE la plus fine pour un département donné */
export function getRegionalSeries(codeDepartement) {
  if (!codeDepartement) return PROVINCE;
  const dept = codeDepartement.padStart(2, '0');

  if (DEPT_OVERRIDES[dept]) return DEPT_OVERRIDES[dept];

  for (const [key, depts] of Object.entries(DEPT_TO_REGION)) {
    if (depts.includes(dept)) return REGIONS[key];
  }
  return PROVINCE;
}

/** Récupère et parse une série Notaires-INSEE via l'API BDM (SDMX), triée par trimestre croissant */
export async function fetchInseeSeries(idbank) {
  const res = await fetch(`${BDM_URL}/${idbank}`, {
    headers: { Accept: 'application/xml' },
    next: { revalidate: 604800, tags: ['insee-indices'] }, // 7 jours — séries trimestrielles, jamais urgentes
  });

  if (!res.ok) return null;

  const xml = await res.text();
  const obsRegex = /<Obs\s+TIME_PERIOD="([^"]+)"\s+OBS_VALUE="([^"]+)"/g;
  const points = [];
  let match;
  while ((match = obsRegex.exec(xml)) !== null) {
    points.push({ period: match[1], value: parseFloat(match[2]) });
  }
  points.sort((a, b) => a.period.localeCompare(b.period));
  return points.length ? points : null;
}

/** % d'évolution entre la dernière valeur de la série et celle N points plus tôt */
export function computeEvolution(series, pointsBack) {
  if (!series || series.length <= pointsBack) return null;
  const latest = series[series.length - 1];
  const past = series[series.length - 1 - pointsBack];
  if (!past.value) return null;
  return {
    pct: Math.round(((latest.value / past.value) - 1) * 1000) / 10,
    latestPeriod: latest.period,
    pastPeriod: past.period,
    latestValue: latest.value,
  };
}

/**
 * Indice local "maison" — évolution du prix/m² médian par année pour un département,
 * calculé directement depuis nos données DVF (pas de source officielle à cette maille).
 */
export async function getLocalIndex(pool, codeDepartement) {
  if (!codeDepartement) return null;

  const query = `
    SELECT
      extract(year from date_mutation)::int AS annee,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY valeur_fonciere / surface_reelle_bati) AS prix_m2_median,
      count(*) AS nb
    FROM transactions
    WHERE code_departement = $1
      AND type_local IN ('Maison', 'Appartement')
      AND nature_mutation = 'Vente'
      AND valeur_fonciere > 1000
      AND surface_reelle_bati > 8
    GROUP BY 1
    HAVING count(*) >= 20
    ORDER BY 1;
  `;

  const result = await pool.query(query, [codeDepartement]);
  const rows = result.rows.map(r => ({
    annee: r.annee,
    prixM2: Math.round(parseFloat(r.prix_m2_median)),
    nb: parseInt(r.nb, 10),
  }));

  if (rows.length < 2) return null;

  const base = rows[0];
  const latest = rows[rows.length - 1];
  const prevYear = rows.find(r => r.annee === latest.annee - 1) || rows[rows.length - 2];

  return {
    annees: rows,
    baseAnnee: base.annee,
    latestAnnee: latest.annee,
    latestPrixM2: latest.prixM2,
    evolutionUnAn: prevYear ? Math.round(((latest.prixM2 / prevYear.prixM2) - 1) * 1000) / 10 : null,
    evolutionDepuisBase: Math.round(((latest.prixM2 / base.prixM2) - 1) * 1000) / 10,
  };
}
