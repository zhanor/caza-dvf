'use client';

/**
 * Libellés lisibles des alertes de regroupement DVF (voir lib/dvf-mutation.js).
 *
 * `niveau` distingue ce qui invalide le prix au m² (rouge) de ce qui demande seulement
 * une lecture avertie (ambre). Les dépendances sont volontairement en ambre : elles
 * gonflent le prix sans qu'on sache de combien, mais il n'existe aucun seuil normé à
 * partir duquel la référence deviendrait inutilisable — c'est à l'expert de trancher.
 */
export const LIBELLES_ALERTES = {
  MULTI_DISPOSITIONS: {
    niveau: 'rouge',
    court: 'Multi-dispositions',
    detail: "La mutation regroupe plusieurs dispositions : impossible de savoir si le prix couvre l'ensemble. Prix au m² inexploitable.",
  },
  TYPES_MIXTES: {
    niveau: 'rouge',
    court: 'Types mixtes',
    detail: "Habitation et local commercial vendus ensemble : le prix global ne se rapporte pas à une surface homogène.",
  },
  NATURE_NON_VENTE: {
    niveau: 'rouge',
    court: 'Pas une vente',
    detail: "Nature de mutation autre qu'une vente (adjudication, échange, expropriation...) : prix non comparable.",
  },
  PRIX_SYMBOLIQUE: {
    niveau: 'rouge',
    court: 'Prix symbolique',
    detail: "Moins de 1 000 €/m² : vente entre proches, nue-propriété, ou prix non représentatif du marché.",
  },
  MULTI_LOCAUX: {
    niveau: 'ambre',
    court: 'Plusieurs locaux',
    detail: "Plusieurs locaux principaux vendus en bloc. La surface est leur somme ; le prix au m² est une moyenne.",
  },
  MULTI_PARCELLES: {
    niveau: 'ambre',
    court: 'Plusieurs parcelles',
    detail: 'La mutation porte sur plusieurs parcelles cadastrales.',
  },
  CARREZ_INCOMPLETE: {
    niveau: 'ambre',
    court: 'Carrez incomplète',
    detail: "Le fichier DVF ne détaille que 5 lots par ligne : la surface Carrez totale est partielle.",
  },
  ECART_CARREZ: {
    niveau: 'ambre',
    court: 'Écart Carrez',
    detail: 'Plus de 10 % d’écart entre surface Carrez et surface réelle bâtie.',
  },
  DOUBLON_POSSIBLE: {
    niveau: 'ambre',
    court: 'Doublon possible',
    detail: "Deux lignes principales strictement identiques : vrai doublon du fichier ou deux locaux jumeaux, impossible de trancher. Les deux sont comptées.",
  },
  DEPENDANCES_INCLUSES: {
    niveau: 'ambre',
    court: 'Dépendances incluses',
    detail: "Le prix inclut des dépendances (cave, parking, chambre de service) non ventilées : le prix au m² habitable est surestimé d'autant.",
  },
};

/** Sépare "DEPENDANCES_INCLUSES(3)" en { code, parametre }. */
export function parseAlerte(alerte) {
  const m = /^([A-Z_]+)(?:\((.*)\))?$/.exec(alerte);
  return { code: m ? m[1] : alerte, parametre: m && m[2] ? m[2] : null };
}

const CLASSES = {
  rouge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  ambre: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
};

export default function AlertesBadges({ alertes = [], compact = false }) {
  if (!alertes.length) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {alertes.map((alerte) => {
        const { code, parametre } = parseAlerte(alerte);
        const info = LIBELLES_ALERTES[code] || { niveau: 'ambre', court: code, detail: code };
        return (
          <span
            key={alerte}
            title={info.detail}
            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border cursor-help ${CLASSES[info.niveau]}`}
          >
            {info.court}
            {parametre ? ` (${parametre})` : ''}
          </span>
        );
      })}
    </div>
  );
}
