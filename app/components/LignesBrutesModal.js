'use client';

import { useEffect, useState } from 'react';
import AlertesBadges from './AlertesBadges';

const fmt = (v, suffixe = '') =>
  v === null || v === undefined || v === '' ? '—' : `${v}${suffixe}`;

/**
 * Affiche toutes les lignes DVF brutes d'une mutation, à côté du résultat agrégé.
 *
 * C'est la pièce justificative du regroupement : un expert doit pouvoir vérifier d'où
 * sortent une surface et une alerte avant de reprendre la référence dans un rapport.
 */
export default function LignesBrutesModal({ idMutation, onClose }) {
  const [etat, setEtat] = useState({ chargement: true, erreur: null, donnees: null });

  useEffect(() => {
    if (!idMutation) return;
    let annule = false;

    setEtat({ chargement: true, erreur: null, donnees: null });
    fetch(`/api/mutation/${encodeURIComponent(idMutation)}`)
      .then((r) => (r.ok ? r.json() : r.json().then((d) => Promise.reject(new Error(d.error)))))
      .then((d) => !annule && setEtat({ chargement: false, erreur: null, donnees: d }))
      .catch((e) => !annule && setEtat({ chargement: false, erreur: e.message, donnees: null }));

    return () => { annule = true; };
  }, [idMutation]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!idMutation) return null;

  const agregat = etat.donnees?.agregat;
  const lignes = etat.donnees?.lignes || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Lignes DVF brutes de la mutation ${idMutation}`}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-6xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-800">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-slate-100">
              Lignes DVF brutes — mutation {idMutation}
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Une ligne du fichier DVF = un local, pas une vente. La valeur foncière est le prix
              total, répété sur chaque ligne.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 p-1"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="overflow-auto p-5">
          {etat.chargement && (
            <p className="text-sm text-gray-500 dark:text-slate-400">Chargement…</p>
          )}
          {etat.erreur && (
            <p className="text-sm text-red-600 dark:text-red-400">Erreur : {etat.erreur}</p>
          )}

          {agregat && (
            <div className="mb-5 p-3 rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">Prix</div>
                  <div className="font-bold text-gray-900 dark:text-slate-100">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(agregat.prix)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">Surface bâtie totale</div>
                  <div className="font-bold text-gray-900 dark:text-slate-100">
                    {fmt(agregat.surface_bati_totale, ' m²')}
                    {agregat.nb_locaux_principaux > 1 && (
                      <span className="font-normal text-xs text-gray-500 dark:text-slate-400">
                        {' '}({agregat.nb_locaux_principaux} locaux)
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">Surface Carrez</div>
                  <div className="font-bold text-gray-900 dark:text-slate-100">
                    {fmt(agregat.surface_carrez_totale, ' m²')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">Prix/m²</div>
                  <div className={`font-bold ${agregat.prix_m2_fiable ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                    {agregat.prix_m2
                      ? `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(agregat.prix_m2)} €/m²`
                      : '—'}
                    {!agregat.prix_m2_fiable && <span className="text-xs font-normal"> (non fiable)</span>}
                  </div>
                </div>
              </div>
              <AlertesBadges alertes={agregat.alertes} />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                {agregat.nb_lignes} ligne{agregat.nb_lignes > 1 ? 's' : ''} ·{' '}
                {agregat.nb_locaux_principaux} local/locaux principal(aux) ·{' '}
                {agregat.nb_dependances} dépendance{agregat.nb_dependances > 1 ? 's' : ''} ·{' '}
                parcelle{agregat.parcelles.length > 1 ? 's' : ''} {agregat.parcelles.join(', ')}
              </p>
            </div>
          )}

          {lignes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">
                    <th className="px-2 py-2 text-left font-semibold">#</th>
                    <th className="px-2 py-2 text-left font-semibold">Type local</th>
                    <th className="px-2 py-2 text-right font-semibold">Surf. bâtie</th>
                    <th className="px-2 py-2 text-right font-semibold">Pièces</th>
                    <th className="px-2 py-2 text-left font-semibold">Lots (n° : Carrez)</th>
                    <th className="px-2 py-2 text-right font-semibold">Nb lots</th>
                    <th className="px-2 py-2 text-left font-semibold">Parcelle</th>
                    <th className="px-2 py-2 text-right font-semibold">Surf. terrain</th>
                    <th className="px-2 py-2 text-right font-semibold">Valeur foncière</th>
                    <th className="px-2 py-2 text-left font-semibold">Dispo.</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {lignes.map((l, i) => {
                    const lots = [1, 2, 3, 4, 5]
                      .map((n) => (l[`lot${n}_numero`]
                        ? `${l[`lot${n}_numero`]} : ${l[`lot${n}_surface_carrez`] ?? '—'}`
                        : null))
                      .filter(Boolean);
                    const principal = l.type_local && l.type_local !== 'Dépendance';
                    return (
                      <tr
                        key={i}
                        className={`border-b border-gray-100 dark:border-slate-800 ${
                          principal ? '' : 'text-gray-500 dark:text-slate-400'
                        }`}
                      >
                        <td className="px-2 py-1.5">{i + 1}</td>
                        <td className="px-2 py-1.5 font-sans">{l.type_local || '—'}</td>
                        <td className="px-2 py-1.5 text-right">{fmt(l.surface_reelle_bati)}</td>
                        <td className="px-2 py-1.5 text-right">{fmt(l.nombre_pieces_principales)}</td>
                        <td className="px-2 py-1.5">{lots.length ? lots.join(' · ') : '—'}</td>
                        <td className="px-2 py-1.5 text-right">{fmt(l.nombre_lots)}</td>
                        <td className="px-2 py-1.5">{l.id_parcelle}</td>
                        <td className="px-2 py-1.5 text-right">{fmt(l.surface_terrain)}</td>
                        <td className="px-2 py-1.5 text-right">{fmt(l.valeur_fonciere)}</td>
                        <td className="px-2 py-1.5">{l.numero_disposition}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
