'use client';

import { ICC_LATEST } from '../../lib/icc';

/**
 * Composant cartes de statistiques (Prix/m², Nb biens, Surface moyenne)
 */
export default function StatsCards({ avgPriceM2, avgPriceM2ICC, count, avgSurface }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <div
        className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow border-l-4 border-blue-500"
        role="article"
        aria-label="Prix moyen au mètre carré"
      >
        <p className="text-sm text-gray-500 dark:text-slate-400">Prix Moyen / m²</p>
        <p className="text-2xl font-bold dark:text-white">
          {Math.round(avgPriceM2).toLocaleString('fr-FR')} €
        </p>
        {avgPriceM2ICC > 0 && Math.round(avgPriceM2ICC) !== Math.round(avgPriceM2) && (
          <p className="text-sm font-semibold text-orange-500 mt-1" title={`Moyenne actualisée avec ICC ${ICC_LATEST.quarter}`}>
            {Math.round(avgPriceM2ICC).toLocaleString('fr-FR')} € <span className="font-normal text-xs">act. ICC</span>
          </p>
        )}
      </div>

      <div
        className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow border-l-4 border-green-500"
        role="article"
        aria-label="Nombre de biens affichés"
      >
        <p className="text-sm text-gray-500 dark:text-slate-400">Biens affichés</p>
        <p className="text-2xl font-bold dark:text-white">{count}</p>
      </div>

      <div
        className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow border-l-4 border-purple-500"
        role="article"
        aria-label="Surface moyenne"
      >
        <p className="text-sm text-gray-500 dark:text-slate-400">Surface Moyenne</p>
        <p className="text-2xl font-bold dark:text-white">
          {Math.round(avgSurface)} m²
        </p>
      </div>
    </div>
  );
}
