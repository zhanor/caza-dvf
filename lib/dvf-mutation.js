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

/** Colonnes décrivant la subdivision de terrain (nature de culture) portée par une ligne. */
const COLONNES_CULTURE = ['nature_culture', 'nature_culture_speciale', 'surface_terrain'];

const cleColonnes = (ligne, colonnes) => colonnes.map((c) => {
  const v = ligne[c];
  if (v === null || v === undefined) return '';
  return v instanceof Date ? v.toISOString() : String(v);
}).join('|');

/** Identité d'un local : toutes les colonnes comparées, hors subdivision de terrain. */
const COLONNES_LOCAL = COLONNES_COMPARAISON.filter((c) => !COLONNES_CULTURE.includes(c));

/**
 * Retire les répétitions de locaux dues aux natures de culture.
 *
 * Quand une parcelle compte plusieurs natures de culture (« sols » + « jardins », cas très
 * courant pour une maison), le fichier DVF écrit une ligne par couple local × culture : la
 * même maison apparaît alors deux fois, à l'identique hormis `nature_culture` et
 * `surface_terrain`. Sommer ces lignes doublait la surface bâtie et divisait le prix au m²
 * par deux.
 *
 * Pour chaque local (lignes identiques hors colonnes de culture), on compte les cultures
 * distinctes qu'il porte : N lignes sur K cultures représentent N / K locaux réels. Deux
 * locaux jumeaux sur une parcelle à une seule culture (N = 2, K = 1) restent donc bien
 * comptés deux fois.
 *
 * @returns {{locaux: object[], jumeaux: boolean}} Les lignes retenues, dans l'ordre
 *   d'origine, et `jumeaux` si un local principal subsiste en plusieurs exemplaires.
 */
function dedoublonnerLocaux(lignes) {
  const groupes = new Map();
  for (const ligne of lignes) {
    if (!ligne.type_local) continue;
    const signature = cleColonnes(ligne, COLONNES_LOCAL);
    if (!groupes.has(signature)) groupes.set(signature, { lignes: [], cultures: new Set() });
    const groupe = groupes.get(signature);
    groupe.lignes.push(ligne);
    groupe.cultures.add(cleColonnes(ligne, COLONNES_CULTURE));
  }

  const retenues = new Set();
  let jumeaux = false;
  for (const groupe of groupes.values()) {
    const nbReels = Math.ceil(groupe.lignes.length / groupe.cultures.size);
    groupe.lignes.slice(0, nbReels).forEach((l) => retenues.add(l));
    if (nbReels > 1 && TYPES_PRINCIPAUX.includes(groupe.lignes[0].type_local)) jumeaux = true;
  }

  return { locaux: lignes.filter((l) => retenues.has(l)), jumeaux };
}

/**
 * Surface de terrain de la mutation, chaque subdivision n'étant comptée qu'une fois.
 *
 * Pendant de dedoublonnerLocaux : la surface d'une subdivision est répétée sur chaque
 * local de la parcelle (une maison + une dépendance sur 760 m² donnent deux lignes à
 * 760 m²). On ne retient donc qu'une occurrence par parcelle × nature de culture × surface.
 * Limite assumée : deux subdivisions de même nature et de même surface sur une même
 * parcelle sont indiscernables d'une répétition et ne comptent qu'une fois.
 */
function surfaceTerrainTotale(lignes) {
  const subdivisions = new Map();
  for (const ligne of lignes) {
    const surface = num(ligne.surface_terrain);
    if (!surface) continue;
    subdivisions.set(`${ligne.id_parcelle ?? ''}|${cleColonnes(ligne, COLONNES_CULTURE)}`, surface);
  }
  let total = 0;
  for (const surface of subdivisions.values()) total += surface;
  return total;
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

  // Un local répété pour chaque nature de culture de sa parcelle n'est compté qu'une fois.
  const { locaux, jumeaux } = dedoublonnerLocaux(lignes);
  const principaux = locaux.filter((l) => TYPES_PRINCIPAUX.includes(l.type_local));
  const dependances = locaux.filter((l) => l.type_local === TYPE_DEPENDANCE);

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

  // --- Surface bâtie : somme des locaux principaux distincts. ---
  const surfaceBatieTotale = principaux.reduce((t, l) => t + (num(l.surface_reelle_bati) || 0), 0);

  // Deux lignes principales strictement identiques, culture comprise : vrais doublons du
  // fichier ou deux locaux distincts aux attributs identiques — impossible de trancher. On
  // les compte toutes les deux (pas de suppression silencieuse) et on le signale.
  if (jumeaux) alertes.push('DOUBLON_POSSIBLE');

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

  const surfaceTerrain = surfaceTerrainTotale(lignes);

  // Pour l'adresse et le point affiché, un local principal est plus représentatif qu'une
  // dépendance (qui peut être sur une autre parcelle, un box dans une rue adjacente...).
  //
  // Une même mutation peut porter sur des biens éloignés (plusieurs immeubles vendus dans
  // un seul acte). Quand la recherche part d'un point (`procheDe`), on montre celui qui est
  // près de ce point : sinon une vente trouvée dans le rayon pouvait s'afficher avec
  // l'adresse et le point d'un autre bien, à des dizaines de kilomètres.
  const candidatsVitrine = principaux.length ? principaux : [reference];
  const vitrine = options.procheDe
    ? plusProche(candidatsVitrine, options.procheDe)
    : candidatsVitrine[0];

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
 * Ligne la plus proche d'un point. Les lignes sans coordonnées passent en dernier ;
 * à distance égale, l'ordre d'origine est conservé.
 */
function plusProche(lignes, { lat, lng }) {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const ecart = (l) => {
    const la = num(l.latitude);
    const lo = num(l.longitude);
    if (la === null || lo === null) return Infinity;
    return (la - lat) ** 2 + ((lo - lng) * cosLat) ** 2;
  };
  return lignes.reduce((meilleure, l) => (ecart(l) < ecart(meilleure) ? l : meilleure));
}

/**
 * Regroupe un lot de lignes DVF hétérogènes par `id_mutation`.
 *
 * @param {object[]} lignes - Lignes brutes de plusieurs mutations mélangées.
 * @param {{seuilPrixSymbolique?: number, procheDe?: {lat: number, lng: number}}} [options]
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
