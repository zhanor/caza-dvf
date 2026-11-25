/**
 * Enrichissement des ventes par la BDNB (Base de données nationale des bâtiments, CSTB,
 * Licence Ouverte 2.0) — tables `bdnb_batiment` et `bdnb_parcelle`, chargées par
 * scripts/import_bdnb_prepare.py puis scripts/import_bdnb_load.js.
 *
 * Rattachement par parcelle cadastrale (jamais par id_mutation, instable d'une livraison DVF
 * à l'autre). Conséquence assumée : les informations décrivent le ou les BÂTIMENTS de la
 * parcelle, pas le lot vendu. Quand la parcelle porte plusieurs bâtiments qui ne
 * concordent pas, on affiche une fourchette ou rien plutôt qu'une valeur arbitraire.
 *
 * Périmètre actuellement en base : Alpes-Maritimes (06) et Var (83).
 */

const distincts = (valeurs) => [...new Set(valeurs.filter((v) => v !== null && v !== undefined && v !== ''))];

/**
 * Résume les bâtiments BDNB d'une parcelle.
 * @param {Array<object>} batiments lignes de `bdnb_batiment` rattachées à la parcelle
 * @returns {object|null} null si aucun bâtiment
 */
export function resumerBdnb(batiments) {
  if (!batiments || batiments.length === 0) return null;

  const annees = distincts(batiments.map((b) => b.annee_construction)).map(Number).sort((a, b) => a - b);
  const niveaux = distincts(batiments.map((b) => b.nb_niveau)).map(Number);
  const dpe = distincts(batiments.map((b) => b.dpe_classe));
  const copros = batiments.filter((b) => b.copro_immat);
  const immats = distincts(copros.map((b) => b.copro_immat));

  const resume = {
    nb_batiments: batiments.length,
    millesime: batiments[0].millesime || null,
    annee_construction_min: annees.length ? annees[0] : null,
    annee_construction_max: annees.length ? annees[annees.length - 1] : null,
    nb_niveau_max: niveaux.length ? Math.max(...niveaux) : null,
    // Le DPE BDNB est un DPE « représentatif » du bâtiment : on ne le retient que s'il n'y
    // a pas d'ambiguïté entre bâtiments de la parcelle.
    dpe_classe: dpe.length === 1 ? dpe[0] : null,
    copro_immat: immats.length === 1 ? immats[0] : null,
    copro_nb_lot_tot: immats.length === 1 ? Number(copros[0].copro_nb_lot_tot) || null : null,
    copropriete: immats.length > 0,
  };
  resume.libelle = libelleBdnb(resume);
  resume.source = `BDNB ${resume.millesime || ''} (CSTB), rattachement par parcelle — ${
    resume.nb_batiments > 1
      ? `${resume.nb_batiments} bâtiments sur la parcelle, les informations ne désignent pas le lot vendu`
      : 'informations du bâtiment, pas du lot vendu'
  }`.replace('  ', ' ');
  return resume;
}

/** Ligne courte affichée sous une vente, ex. « 1972 · 6 niv. · DPE imm. D · Copro 120 lots ». */
export function libelleBdnb(r) {
  const morceaux = [];
  if (r.annee_construction_min !== null) {
    morceaux.push(
      r.annee_construction_min === r.annee_construction_max
        ? `${r.annee_construction_min}`
        : `${r.annee_construction_min}–${r.annee_construction_max}`
    );
  }
  if (r.nb_niveau_max) morceaux.push(`${r.nb_niveau_max} niv.`);
  if (r.dpe_classe) morceaux.push(`DPE imm. ${r.dpe_classe}`);
  if (r.copropriete) morceaux.push(r.copro_nb_lot_tot ? `Copro ${r.copro_nb_lot_tot} lots` : 'Copro');
  return morceaux.join(' · ');
}

/**
 * Charge les résumés BDNB pour une liste de parcelles.
 * Ne lève jamais : si les tables BDNB sont absentes ou la requête échoue, la recherche
 * continue sans enrichissement.
 * @returns {Promise<Map<string, object>>} id_parcelle -> résumé
 */
export async function chargerBdnb(pool, idParcelles) {
  const ids = distincts(idParcelles);
  const resultat = new Map();
  if (ids.length === 0) return resultat;
  try {
    const { rows } = await pool.query(
      `SELECT p.parcelle_id, b.millesime, b.annee_construction, b.nb_niveau, b.dpe_classe,
              b.copro_immat, b.copro_nb_lot_tot
       FROM bdnb_parcelle p
       JOIN bdnb_batiment b USING (batiment_groupe_id)
       WHERE p.parcelle_id = ANY($1::text[])`,
      [ids]
    );
    const parParcelle = new Map();
    for (const r of rows) {
      if (!parParcelle.has(r.parcelle_id)) parParcelle.set(r.parcelle_id, []);
      parParcelle.get(r.parcelle_id).push(r);
    }
    for (const [id, batiments] of parParcelle) {
      const resume = resumerBdnb(batiments);
      if (resume && resume.libelle) resultat.set(id, resume);
    }
  } catch (e) {
    console.error('[bdnb] enrichissement indisponible :', e.message);
  }
  return resultat;
}
