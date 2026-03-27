'use client';

import { actualiserPrixICC, needsActualization, ICC_LATEST } from '../../lib/icc';

/**
 * Composant tableau des transactions (Desktop)
 */
export default function TransactionTable({ transactions, sortConfig, onSort, onDelete }) {
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

  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? '↑' : '↓';
    }
    return '';
  };

  return (
    <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden mb-6">
      <div className="overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-left" role="table">
          <thead className="sticky top-0 z-10 backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-gray-200 dark:border-slate-800">
            <tr>
              <th
                className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
                onClick={() => onSort('date')}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSort('date')}
                aria-sort={sortConfig.key === 'date' ? sortConfig.direction : 'none'}
              >
                Date {getSortIcon('date')}
              </th>
              <th
                className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
                onClick={() => onSort('type')}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSort('type')}
                aria-sort={sortConfig.key === 'type' ? sortConfig.direction : 'none'}
              >
                Type {getSortIcon('type')}
              </th>
              <th
                className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
                onClick={() => onSort('address')}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSort('address')}
                aria-sort={sortConfig.key === 'address' ? sortConfig.direction : 'none'}
              >
                Adresse {getSortIcon('address')}
              </th>
              <th className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase">
                Cadastre
              </th>
              <th
                className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase text-right cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
                onClick={() => onSort('surface')}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSort('surface')}
                aria-sort={sortConfig.key === 'surface' ? sortConfig.direction : 'none'}
              >
                Surf. Hab. {getSortIcon('surface')}
              </th>
              <th
                className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase text-right cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
                onClick={() => onSort('terrain')}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSort('terrain')}
                aria-sort={sortConfig.key === 'terrain' ? sortConfig.direction : 'none'}
              >
                Surf. Ter. {getSortIcon('terrain')}
              </th>
              <th
                className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase text-right cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
                onClick={() => onSort('price')}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSort('price')}
                aria-sort={sortConfig.key === 'price' ? sortConfig.direction : 'none'}
              >
                Prix {getSortIcon('price')}
              </th>
              <th
                className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase text-right cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
                onClick={() => onSort('priceM2')}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSort('priceM2')}
                aria-sort={sortConfig.key === 'priceM2' ? sortConfig.direction : 'none'}
              >
                Prix/m² {getSortIcon('priceM2')}
              </th>
              <th
                className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase text-right cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
                onClick={() => onSort('distance')}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSort('distance')}
                aria-sort={sortConfig.key === 'distance' ? sortConfig.direction : 'none'}
              >
                Dist. {getSortIcon('distance')}
              </th>
              <th
                className="px-3 md:px-4 py-3 md:py-4 font-bold text-orange-500 dark:text-orange-400 text-xs uppercase text-right whitespace-nowrap"
                title={`Prix actualisé avec l'indice ICC INSEE (dernier: ${ICC_LATEST.quarter} = ${ICC_LATEST.value})`}
              >
                Act. ICC
              </th>
              <th className="px-3 md:px-4 py-3 md:py-4 text-center font-bold text-gray-500 dark:text-slate-400 text-xs uppercase">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {transactions.map((item) => {
              const isTerrain = item.type?.includes('Terrain');
              const surfaceRef = isTerrain ? item.terrain : item.surface;
              const pricePerSqm = item.price && surfaceRef > 0 ? item.price / surfaceRef : 0;
              const shouldActualize = item.dateRaw && needsActualization(item.dateRaw);
              const icc = shouldActualize ? actualiserPrixICC(item.price, item.dateRaw) : null;
              const iccPricePerSqm = icc && surfaceRef > 0 ? icc.prixActualise / surfaceRef : 0;

              return (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 dark:hover:bg-slate-800/50 even:bg-gray-50 dark:even:bg-slate-800/50 transition-colors"
                >
                  <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-gray-600 dark:text-slate-300">
                    {item.date}
                  </td>
                  <td className="px-3 md:px-4 py-3 md:py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold border ${
                        item.type?.includes('Maison')
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                          : item.type?.includes('Appartement')
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                          : item.type?.includes('Local')
                          ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800'
                          : item.type?.includes('Terrain')
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                          : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                      }`}
                    >
                      {item.type || '-'}
                    </span>
                  </td>
                  <td className="px-3 md:px-4 py-3 md:py-4 text-sm font-medium text-gray-900 dark:text-slate-300">
                    {item.address}
                  </td>
                  <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-gray-600 dark:text-slate-300 font-mono">
                    {item.cadastre}
                  </td>
                  <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-right text-gray-600 dark:text-slate-300 font-mono">
                    {item.surface} m²
                  </td>
                  <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-right text-gray-600 dark:text-slate-300 font-mono">
                    {item.terrain > 0 ? `${item.terrain} m²` : '-'}
                  </td>
                  <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-right font-bold text-gray-900 dark:text-slate-300 font-mono">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                      maximumFractionDigits: 0,
                    }).format(item.price)}
                  </td>
                  <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-right text-blue-600 dark:text-blue-400 font-medium font-mono">
                    {pricePerSqm === 0 ? (
                      <span className="text-gray-400 dark:text-slate-500">-</span>
                    ) : (
                      <>
                        {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(
                          pricePerSqm
                        )}{' '}
                        €/m²
                        <span className="text-xs text-gray-400 dark:text-slate-500 block font-sans">
                          sur {isTerrain ? 'terrain' : 'hab.'}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-right text-gray-500 dark:text-slate-400 font-mono">
                    {item.distance} m
                  </td>
                  <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-right font-mono">
                    {icc ? (
                      <div>
                        <div className="font-bold text-orange-600 dark:text-orange-400">
                          {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                            maximumFractionDigits: 0,
                          }).format(icc.prixActualise)}
                        </div>
                        {iccPricePerSqm > 0 && (
                          <div className="text-xs text-orange-500 dark:text-orange-400">
                            {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(iccPricePerSqm)} €/m²
                          </div>
                        )}
                        <div className="text-xs text-gray-400 dark:text-slate-500 font-sans mt-0.5">
                          ×{icc.coefficient}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-slate-500 font-sans">
                          {icc.quarterVente}: {icc.iccVente}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-slate-500 font-sans">
                          {icc.quarterLatest}: {icc.iccLatest}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-300 dark:text-slate-700">—</span>
                    )}
                  </td>
                  <td className="px-3 md:px-4 py-3 md:py-4 text-center">
                    <button
                      onClick={() => onDelete(item.id)}
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded transition-colors"
                      title="Supprimer cette transaction"
                      aria-label={`Supprimer la transaction ${item.address}`}
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {transactions.length === 0 && (
        <div className="p-8 text-center text-gray-500 dark:text-slate-400">
          Aucun résultat avec ces filtres.
        </div>
      )}
    </div>
  );
}
