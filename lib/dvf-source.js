/**
 * Provenance du jeu de données DVF actuellement en base.
 *
 * À mettre à jour à chaque réimport — c'est la seule source de vérité pour la mention
 * « Source » affichée dans l'export PDF et renvoyée par le MCP.
 *
 * Le miroir par commune https://files.data.gouv.fr/geo-dvf/latest/csv/ n'est plus utilisé :
 * data.gouv l'a basculé en « [ARCHIVE] livraison avril — suppression au 31/11/2026 », il
 * était encore daté du 18/05/2026 et ne contenait aucun millésime 2026. On importe
 * désormais le fichier unique publié sur la page du jeu de données.
 */
export const DVF_SOURCE = {
  jeu: 'Demandes de valeurs foncières géolocalisées (Etalab / data.gouv.fr)',
  livraison: '2026-10-20',
  livraisonLabel: '20/10/2026',
  url: 'https://www.data.gouv.fr/datasets/demandes-de-valeurs-foncieres-geolocalisees',
  fichier: 'dvf.csv.gz — juillet 2021 à juin 2026, fichier unique',
  periodeDebut: '2021-07-01',
  periodeFin: '2026-06-30',
};

/** Mention normalisée, ex. « Source : DVF, livraison du 20/10/2026 ». */
export const DVF_SOURCE_LABEL = `Source : DVF, livraison du ${DVF_SOURCE.livraisonLabel}`;
