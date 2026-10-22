/**
 * Regroupement des lignes DVF en mutations.
 *
 * Rappel sur le format DVF géolocalisé : une ligne du fichier = un local (ou une parcelle)
 * d'une disposition d'une mutation, et surtout PAS une vente. En particulier
 * `valeur_fonciere` est le prix total de la disposition, répété à l'identique sur chaque
 * ligne : l'additionner multiplierait le prix par le nombre de locaux.
 *
 * Ce module est la seule implémentation des règles de regroupement. Le SQL se contente de
 * ramener les lignes brutes des mutations candidates ; tous les calculs (surfaces, Carrez,
 * alertes, fiabilité) se font ici, pour qu'ils soient testables sans base de données et
 * identiques côté site, MCP et export PDF.
 */

/** Types de locaux comptés comme « locaux principaux » (porteurs de surface habitable). */
export const TYPES_PRINCIPAUX = [
  'Maison',
  'Appartement',
  'Local industriel. commercial ou assimilé',
];

const TYPE_DEPENDANCE = 'Dépendance';
const TYPES_HABITATION = ['Maison', 'Appartement'];
const TYPE_COMMERCIAL = 'Local industriel. commercial ou assimilé';

/** Prix au m² en dessous duquel la mutation est considérée comme non représentative. */
export const SEUIL_PRIX_SYMBOLIQUE = 1000;

/** Écart relatif Carrez / bâti au-delà duquel on alerte. */
const SEUIL_ECART_CARREZ = 0.1;

/**
 * Alertes qui rendent le prix au m² inexploitable.
 *
 * Les dépendances n'en font volontairement pas partie : il n'existe pas de seuil normé
 * au-delà duquel un nombre de caves ou de parkings invaliderait le prix. L'information est
 * exposée (`nb_dependances`, alerte DEPENDANCES_INCLUSES) et c'est à l'utilisateur de
 * filtrer, via `max_dependances`.
 */
export const ALERTES_NON_FIABLES = [
  'MULTI_DISPOSITIONS',
  'TYPES_MIXTES',
  'NATURE_NON_VENTE',
  'PRIX_SYMBOLIQUE',
];

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

/** Colonnes comparées pour détecter deux lignes DVF strictement identiques. */
const COLONNES_COMPARAISON = [
  'id_mutation', 'date_mutation', 'numero_disposition', 'nature_mutation', 'valeur_fonciere',
  'adresse_numero', 'adresse_suffixe', 'adresse_nom_voie', 'adresse_code_voie', 'code_postal',
  'code_commune', 'nom_commune', 'code_departement', 'id_parcelle', 'numero_volume',
  'lot1_numero', 'lot1_surface_carrez', 'lot2_numero', 'lot2_surface_carrez',
  'lot3_numero', 'lot3_surface_carrez', 'lot4_numero', 'lot4_surface_carrez',
  'lot5_numero', 'lot5_surface_carrez', 'nombre_lots', 'code_type_local', 'type_local',
  'surface_reelle_bati', 'nombre_pieces_principales', 'nature_culture', 'surface_terrain',
  'longitude', 'latitude',
];

function signatureLigne(ligne) {
  return COLONNES_COMPARAISON.map((c) => {
    const v = ligne[c];
    if (v === null || v === undefined) return '';
    return v instanceof Date ? v.toISOString() : String(v);
  }).join('|');
}

/**
 * Surface Carrez d'un ensemble de lignes, chaque numéro de lot n'étant compté qu'une fois.
 *
 * Le même lot peut apparaître sur plusieurs lignes de la mutation (le lot principal est
 * souvent répété sur les lignes de dépendance) : sommer sans dédoublonner gonflerait la
 * surface. On ne lit que les lignes fournies — l'appelant ne passe que les locaux
 * principaux, car les lignes Dépendance portent leurs propres lots (caves, parkings) qui
 * ne font pas partie de la surface habitable.
 */
function lireLots(lignes) {
  const lots = new Map();
  let maxNombreLots = 0;

  for (const ligne of lignes) {
    maxNombreLots = Math.max(maxNombreLots, num(ligne.nombre_lots) || 0);
    for (let i = 1; i <= 5; i += 1) {
      const numero = ligne[`lot${i}_numero`];
      if (numero === null || numero === undefined || numero === '') continue;
      const surface = num(ligne[`lot${i}_surface_carrez`]);
      const cle = String(numero);
      // Un lot déjà vu sans surface peut être complété par une autre ligne qui la porte.
      if (!lots.has(cle) || (lots.get(cle) === null && surface !== null)) {
        lots.set(cle, surface);
      }
    }
  }

  const surfaces = [...lots.values()].filter((s) => s !== null && s > 0);
  return {
    nbLotsLus: lots.size,
    maxNombreLots,
    surfaceCarrez: surfaces.length ? surfaces.reduce((a, b) => a + b, 0) : null,
  };
}

/**
 * Regroupe toutes les lignes DVF d'une même mutation en un objet exploitable.
 *
 * @param {object[]} lignes - Toutes les lignes brutes partageant le même `id_mutation`,
 *   dépendances et lignes sans `type_local` comprises. Passer un sous-ensemble fausserait
 *   les comptages (c'est exactement le bug que ce module corrige).
 * @param {{seuilPrixSymbolique?: number}} [options]
 * @returns {object|null} La mutation agrégée, ou null si `lignes` est vide.
 */
export function agregerMutation(lignes, options = {}) {
  if (!lignes || lignes.length === 0) return null;

  const seuilPrixSymbolique = options.seuilPrixSymbolique ?? SEUIL_PRIX_SYMBOLIQUE;
  const reference = lignes[0];
  const alertes = [];

  const principaux = lignes.filter((l) => TYPES_PRINCIPAUX.includes(l.type_local));
  const dependances = lignes.filter((l) => l.type_local === TYPE_DEPENDANCE);

  // --- Prix : jamais une somme. `valeur_fonciere` est déjà le prix total, répété. ---
  const valeurs = [...new Set(lignes.map((l) => num(l.valeur_fonciere)).filter((v) => v !== null))];
  const prix = valeurs.length ? valeurs[0] : null;

  const dispositions = [...new Set(lignes.map((l) => l.numero_disposition).filter(Boolean))];
  if (dispositions.length > 1) {
    // Plusieurs dispositions = plusieurs transactions agrégées sous un même id_mutation.
    // On ne peut pas savoir si `valeur_fonciere` couvre l'ensemble ou une seule d'entre
    // elles, donc on en retient une seule et on marque le prix au m² comme non fiable.
    alertes.push('MULTI_DISPOSITIONS');
  }

  // --- Surface bâtie : somme des locaux principaux (le bug corrigé : c'était un MAX). ---
  const surfaceBatieTotale = principaux.reduce((t, l) => t + (num(l.surface_reelle_bati) || 0), 0);

  // Deux lignes principales strictement identiques : vrais doublons du fichier ou deux
  // locaux distincts aux attributs identiques — impossible de trancher. On les compte
  // toutes les deux (pas de suppression silencieuse) et on le signale.
  const signatures = principaux.map(signatureLigne);
  if (new Set(signatures).size < signatures.length) {
    alertes.push('DOUBLON_POSSIBLE');
  }

  // --- Carrez : sur les locaux principaux uniquement, chaque lot compté une fois. ---
  const { nbLotsLus, maxNombreLots, surfaceCarrez } = lireLots(principaux);
  if (surfaceCarrez !== null && maxNombreLots > nbLotsLus) {
    // Au-delà de 5 lots par ligne, le fichier DVF tronque la Carrez : le total est partiel.
    // On ne le signale que si une Carrez existe — sans aucune valeur, il n'y a pas de
    // surface « incomplète », simplement pas de Carrez du tout.
    alertes.push('CARREZ_INCOMPLETE');
  }

  const nbDependances = dependances.length;
  if (nbDependances >= 1) {
    // Le prix inclut des caves / parkings / chambres de service non ventilés.
    alertes.push(`DEPENDANCES_INCLUSES(${nbDependances})`);
  }

  if (principaux.length > 1) alertes.push('MULTI_LOCAUX');

  const typesLocaux = [...new Set(lignes.map((l) => l.type_local).filter(Boolean))].sort();
  const aHabitation = typesLocaux.some((t) => TYPES_HABITATION.includes(t));
  if (aHabitation && typesLocaux.includes(TYPE_COMMERCIAL)) {
    alertes.push('TYPES_MIXTES');
  }

  const parcelles = [...new Set(lignes.map((l) => l.id_parcelle).filter(Boolean))].sort();
  if (parcelles.length > 1) alertes.push('MULTI_PARCELLES');

  if (surfaceCarrez !== null && surfaceBatieTotale > 0) {
    const ecart = Math.abs(surfaceCarrez - surfaceBatieTotale) / surfaceBatieTotale;
    if (ecart > SEUIL_ECART_CARREZ) alertes.push('ECART_CARREZ');
  }

  const natures = [...new Set(lignes.map((l) => l.nature_mutation).filter(Boolean))];
  if (natures.some((n) => n !== 'Vente')) alertes.push('NATURE_NON_VENTE');

  const prixM2 = prix !== null && surfaceBatieTotale > 0 ? prix / surfaceBatieTotale : null;
  const prixM2Carrez = prix !== null && surfaceCarrez ? prix / surfaceCarrez : null;

  if (prixM2 !== null && prixM2 < seuilPrixSymbolique) alertes.push('PRIX_SYMBOLIQUE');

  const surfaceTerrain = lignes.reduce((t, l) => t + (num(l.surface_terrain) || 0), 0);

  // Pour l'adresse et le point affiché, un local principal est plus représentatif qu'une
  // dépendance (qui peut être sur une autre parcelle, un box dans une rue adjacente...).
  const vitrine = principaux[0] || reference;

  return {
    id_mutation: reference.id_mutation,
    date_mutation: reference.date_mutation,
    nature_mutation: reference.nature_mutation,
    adresse_numero: vitrine.adresse_numero,
    adresse_nom_voie: vitrine.adresse_nom_voie,
    code_postal: vitrine.code_postal,
    nom_commune: vitrine.nom_commune,
    id_parcelle: vitrine.id_parcelle,
    latitude: num(vitrine.latitude),
    longitude: num(vitrine.longitude),
    nombre_pieces_principales: num(vitrine.nombre_pieces_principales),
    prix,
    surface_bati_totale: surfaceBatieTotale || null,
    surface_carrez_totale: surfaceCarrez,
    surface_terrain: surfaceTerrain || null,
    prix_m2: prixM2,
    prix_m2_carrez: prixM2Carrez,
    nb_locaux_principaux: principaux.length,
    nb_dependances: nbDependances,
    nb_lignes: lignes.length,
    types_locaux: typesLocaux,
    parcelles,
    alertes,
    prix_m2_fiable: !alertes.some((a) => ALERTES_NON_FIABLES.includes(a.replace(/\(.*\)$/, ''))),
  };
}

/**
 * Regroupe un lot de lignes DVF hétérogènes par `id_mutation`.
 *
 * @param {object[]} lignes - Lignes brutes de plusieurs mutations mélangées.
 * @param {{seuilPrixSymbolique?: number}} [options]
 * @returns {object[]} Une entrée par mutation, dans l'ordre d'apparition.
 */
export function agregerMutations(lignes, options = {}) {
  const parMutation = new Map();
  for (const ligne of lignes) {
    const cle = ligne.id_mutation;
    if (!parMutation.has(cle)) parMutation.set(cle, []);
    parMutation.get(cle).push(ligne);
  }
  return [...parMutation.values()].map((g) => agregerMutation(g, options));
}
