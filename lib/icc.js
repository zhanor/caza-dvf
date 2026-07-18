/**
 * Indice du Coût de la Construction (ICC) - Source INSEE (API BDM, idbank 000008630)
 * Formule : Prix actualisé = Prix vente × (ICC_dernier / ICC_trimestre_vente)
 *
 * Les valeurs de l'indice ne sont pas codées en dur ici : elles sont récupérées
 * en direct via /api/icc (voir lib/icc.js consommateurs) et passées en paramètre.
 */

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
 * @param {number} prixOriginal
 * @param {Date|string} dateVente
 * @param {Record<string, number>} iccSeries - map "YYYY-TN" -> valeur ICC (fourni par /api/icc)
 * @param {{quarter: string, value: number}} iccLatest - dernier indice connu (fourni par /api/icc)
 * @returns {{ prixActualise, coefficient, iccVente, quarterVente, iccLatest, quarterLatest } | null}
 */
export function actualiserPrixICC(prixOriginal, dateVente, iccSeries, iccLatest) {
  if (!prixOriginal || !iccSeries || !iccLatest) return null;

  const quarterKey = getQuarterKey(dateVente);
  const iccVente = iccSeries[quarterKey];
  if (!iccVente) return null;

  const coefficient = iccLatest.value / iccVente;
  const prixActualise = Math.round(prixOriginal * coefficient);

  return {
    prixActualise,
    coefficient: Math.round(coefficient * 1000) / 1000,
    iccVente,
    quarterVente: quarterKey.replace('-', ' '),
    iccLatest: iccLatest.value,
    quarterLatest: iccLatest.quarter,
  };
}
