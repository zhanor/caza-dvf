'use client';

import { actualiserPrixICC, needsActualization } from '../../lib/icc';

/**
 * Composant cartes des transactions (Mobile)
 */
export default function TransactionCards({ transactions, onDelete, selectedIds = new Set(), onToggleSelect }) {
  const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );

  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800">
        Aucun résultat avec ces filtres.
      </div>
    );
  }

  return (
    <div className="block md:hidden mb-6">
      <div className="grid grid-cols-1 gap-4">
        {transactions.map((item) => {
          const isTerrain = item.type?.includes('Terrain');
          const surfaceRef = isTerrain ? item.terrain : item.surface;
          const pricePerSqm = item.price && surfaceRef > 0 ? item.price / surfaceRef : 0;
          const shouldActualize = item.dateRaw && needsActualization(item.dateRaw);
          const icc = shouldActualize ? actualiserPrixICC(item.price, item.dateRaw) : null;
          const iccPricePerSqm = icc && surfaceRef > 0 ? icc.prixActualise / surfaceRef : 0;
          const selected = selectedIds.has(item.id);

          const badgeColor = item.type?.includes('Maison')
            ? 'text-emerald-700 dark:text-emerald-400'
            : item.type?.includes('Appartement')
            ? 'text-blue-700 dark:text-blue-400'
            : item.type?.includes('Local')
            ? 'text-purple-700 dark:text-purple-400'
            : item.type?.includes('Terrain')
            ? 'text-amber-700 dark:text-amber-400'
            : 'text-gray-700 dark:text-gray-300';

          return (
            <article
              key={item.id}
              onClick={() => onToggleSelect && onToggleSelect(item.id)}
              className={`rounded-lg shadow-sm border p-4 cursor-pointer transition-all ${
                selected
                  ? 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800'
                  : 'bg-gray-50 dark:bg-slate-800/50 border-gray-100 dark:border-slate-700 opacity-50'
              }`}
            >
              {/* Ligne 1 : # + Type + Prix */}
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white flex-shrink-0 ${selected ? 'bg-blue-500' : 'bg-gray-300'}`}>
                    {item.refNum}
                  </span>
                  <span className={`font-bold text-sm ${badgeColor}`}>{item.type || '-'}</span>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${icc ? 'text-gray-400 dark:text-slate-500 line-through text-base' : 'text-gray-900 dark:text-slate-100'}`}>
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                      maximumFractionDigits: 0,
                    }).format(item.price)}
                  </div>
                  {icc && (
                    <div className="text-base font-bold text-orange-600 dark:text-orange-400">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                        maximumFractionDigits: 0,
                      }).format(icc.prixActualise)}
                      <span className="text-xs font-normal ml-1">ICC</span>
                    </div>
                  )}
                  {(icc ? iccPricePerSqm : pricePerSqm) > 0 && (
                    <div className={`text-xs mt-1 ${icc ? 'text-orange-500' : 'text-gray-400 dark:text-slate-500'}`}>
                      {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(
                        icc ? iccPricePerSqm : pricePerSqm
                      )}{' '}
                      € / m²
                    </div>
                  )}
                </div>
              </div>

              {/* Ligne 2 : Adresse + Distance */}
              <div className="flex justify-between items-start text-sm text-gray-700 dark:text-slate-300 mb-3">
                <div className="flex-1">{item.address}</div>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 ml-2 whitespace-nowrap">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {item.distance} m
                </div>
              </div>

              {/* Ligne 3 : Surfaces */}
              <div className="flex gap-4 text-xs text-gray-600 dark:text-slate-400 mb-3">
                <span>Hab: {item.surface} m²</span>
                {item.terrain > 0 && <span>Ter: {item.terrain} m²</span>}
              </div>

              {/* Ligne 4 : Date + Cadastre + Action */}
              <div className="flex justify-between items-center text-xs">
                <div className="flex gap-3 items-center">
                  <time className="text-gray-600 dark:text-slate-400">{item.date}</time>
                  <span className="text-gray-400 dark:text-slate-500 font-mono">
                    {item.cadastre}
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                  className="text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded transition-colors"
                  title="Supprimer cette transaction"
                  aria-label={`Supprimer la transaction ${item.address}`}
                >
                  <TrashIcon />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
