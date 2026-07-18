'use client';

import Link from 'next/link';

/**
 * Composant cartes de statistiques (Prix/m², Nb biens, Surface moyenne)
 */
export default function StatsCards({ avgPriceM2, avgPriceM2ICC, count, avgSurface, iccLatest }) {
  const hasICC = avgPriceM2ICC > 0 && Math.round(avgPriceM2ICC) !== Math.round(avgPriceM2);
  const estimBasePrice = hasICC ? Math.round(avgPriceM2ICC) : Math.round(avgPriceM2);
  const estimUrl = `/estimateur?basePrice=${estimBasePrice}${hasICC ? '&icc=1' : ''}`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <Link
        href={estimUrl}
        className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer group"
        role="article"
        aria-label="Prix moyen au mètre carré — Cliquer pour estimer"
        title="Cliquer pour ouvrir l'estimateur"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-xs text-blue-500 group-hover:text-blue-600 font-medium transition-colors">
            Estimer →
          </span>
        </div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Prix Moyen / m²</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">
          {Math.round(avgPriceM2).toLocaleString('fr-FR')} €
        </p>
        {hasICC && (
          <p className="text-sm font-semibold text-orange-500 mt-1" title={`Moyenne actualisée avec ICC ${iccLatest?.quarter || ''}`}>
            {Math.round(avgPriceM2ICC).toLocaleString('fr-FR')} € <span className="font-normal text-xs">act. ICC</span>
          </p>
        )}
      </Link>

      <div
        className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800"
        role="article"
        aria-label="Nombre de biens affichés"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
        </div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Biens affichés</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{count}</p>
      </div>

      <div
        className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800"
        role="article"
        aria-label="Surface moyenne"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </div>
        </div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Surface Moyenne</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">
          {Math.round(avgSurface)} m²
        </p>
      </div>
    </div>
  );
}
