/**
 * Indices du Coût de la Construction (ICC) - Source INSEE
 * Formule : Prix actualisé = Prix vente × (ICC_dernier / ICC_trimestre_vente)
 */

const ICC_DATA = {
  '2019-T1': 1677,
  '2019-T2': 1680,
  '2019-T3': 1694,
  '2019-T4': 1701,
  '2020-T1': 1706,
  '2020-T2': 1697,
  '2020-T3': 1704,
  '2020-T4': 1717,
  '2021-T1': 1721,
  '2021-T2': 1762,
  '2021-T3': 1790,
  '2021-T4': 1846,
  '2022-T1': 1951,
  '2022-T2': 2026,
  '2022-T3': 2054,
  '2022-T4': 2065,
  '2023-T1': 2077,
  '2023-T2': 2085,
  '2023-T3': 2076,
  '2023-T4': 2068,
  '2024-T1': 2061,
  '2024-T2': 2055,
  '2024-T3': 2052,
  '2024-T4': 2057,
  '2025-T1': 2053,
  '2025-T2': 2051,
  '2025-T3': 2054,
  '2025-T4': 2058,
};

export const ICC_LATEST = { quarter: 'T4 2025', value: 2058 };

export function getQuarterKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const quarter = Math.ceil((d.getMonth() + 1) / 3);
  return `${year}-T${quarter}`;
}

export function needsActualization(dateVente) {
  const d = dateVente instanceof Date ? dateVente : new Date(dateVente);
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  return d < twoYearsAgo;
}

/**
 * Calcule le prix actualisé avec l'indice ICC
 * @returns {{ prixActualise, coefficient, iccVente, quarterVente } | null}
 */
export function actualiserPrixICC(prixOriginal, dateVente) {
  const quarterKey = getQuarterKey(dateVente);
  const iccVente = ICC_DATA[quarterKey];

  if (!iccVente || !prixOriginal) return null;

  const coefficient = ICC_LATEST.value / iccVente;
  const prixActualise = Math.round(prixOriginal * coefficient);

  return {
    prixActualise,
    coefficient: Math.round(coefficient * 1000) / 1000,
    iccVente,
    quarterVente: quarterKey.replace('-', ' '),
    iccLatest: ICC_LATEST.value,
    quarterLatest: ICC_LATEST.quarter,
  };
}
