'use client';

import { Component } from 'react';
import dynamic from 'next/dynamic';

// Error boundary pour protéger le bouton PDF sans crasher toute la page
class PdfErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// Chargement combiné : PDFDownloadLink + TransactionPdf dans le même import
// Évite la race condition entre les deux chargements dynamiques
const PdfExportButton = dynamic(
  () =>
    Promise.all([
      import('@react-pdf/renderer').then((m) => m.PDFDownloadLink),
      import('./TransactionPdf').then((m) => m.default),
    ]).then(([PDFDownloadLink, TransactionPdf]) => {
      return function PdfExportButton({ transactions, searchedAddress, avgPriceM2, avgPriceM2ICC, searchCenter }) {
        return (
          <PDFDownloadLink
            document={
              <TransactionPdf
                transactions={transactions}
                searchedAddress={searchedAddress}
                avgPriceM2={avgPriceM2}
                avgPriceM2ICC={avgPriceM2ICC}
                searchCenter={searchCenter}
              />
            }
            fileName={`evaluation-dvf-${new Date().toISOString().split('T')[0]}.pdf`}
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm w-full md:w-auto justify-center"
            aria-label="Exporter les transactions en PDF"
          >
            {({ loading }) => (
              <>
                <span>📄</span>
                <span>{loading ? 'Génération...' : 'Export PDF'}</span>
              </>
            )}
          </PDFDownloadLink>
        );
      };
    }),
  {
    ssr: false,
    loading: () => (
      <span className="text-gray-500 text-sm">Chargement PDF...</span>
    ),
  }
);

/**
 * Composant toolbar avec filtres, rayon et export PDF
 */
export default function Toolbar({
  filters,
  onFiltersChange,
  radius,
  onRadiusChange,
  transactions,
  searchedAddress,
  avgPriceM2,
  avgPriceM2ICC,
  searchCenter,
  selectedCount,
  totalCount,
}) {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 mb-6 flex flex-col md:flex-row gap-4 items-center md:justify-between">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center flex-wrap w-full md:w-auto">
        {/* Filtres */}
        <div
          className="flex gap-3 items-center flex-wrap justify-center md:justify-start"
          role="group"
          aria-label="Filtres de type de bien"
        >
          <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
            Filtres :
          </span>
          {Object.keys(filters).map((key) => (
            <label
              key={key}
              className="inline-flex items-center cursor-pointer"
              htmlFor={`filter-${key}`}
            >
              <input
                id={`filter-${key}`}
                type="checkbox"
                checked={filters[key]}
                onChange={(e) =>
                  onFiltersChange({ ...filters, [key]: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-slate-700 focus:ring-blue-500"
                aria-label={`Filtrer par ${key}`}
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-slate-300">
                {key}
              </span>
            </label>
          ))}
        </div>

        {/* Rayon */}
        <div
          className="flex gap-2 items-center flex-wrap justify-center md:justify-start"
          role="group"
          aria-label="Rayon de recherche"
        >
          <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
            Rayon :
          </span>
          {[50, 100, 500, 1000].map((r) => (
            <button
              key={r}
              onClick={() => onRadiusChange(r)}
              className={`px-3 py-2 sm:py-1 rounded text-sm font-medium transition-all ${
                radius === r
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
              aria-pressed={radius === r}
              aria-label={`Rayon de ${r < 1000 ? r + 'm' : '1km'}`}
            >
              {r < 1000 ? `${r}m` : '1km'}
            </button>
          ))}
        </div>
      </div>

      {/* Bouton Export PDF — isolé dans un error boundary */}
      {transactions.length > 0 && (
        <PdfErrorBoundary>
          <div className="flex flex-col items-end gap-1">
            {selectedCount !== undefined && (
              <span className="text-xs text-gray-500 dark:text-slate-400">
                {selectedCount}/{totalCount} sélectionnée{selectedCount > 1 ? 's' : ''}
              </span>
            )}
            <PdfExportButton
              transactions={transactions}
              searchedAddress={searchedAddress}
              avgPriceM2={avgPriceM2}
              avgPriceM2ICC={avgPriceM2ICC}
              searchCenter={searchCenter}
            />
          </div>
        </PdfErrorBoundary>
      )}
    </div>
  );
}
