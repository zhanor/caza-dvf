'use client';

import { Component, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

class PdfErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

const PdfExportButton = dynamic(
  () =>
    Promise.all([
      import('@react-pdf/renderer').then((m) => m.PDFDownloadLink),
      import('./TransactionPdf').then((m) => m.default),
    ]).then(([PDFDownloadLink, TransactionPdf]) => {
      return function PdfExportButton({ transactions, searchedAddress, avgPriceM2, avgPriceM2ICC, searchCenter, mapImageUrl, urbanismeData }) {
        return (
          <PDFDownloadLink
            key={transactions.map(t => t.id).join(',')}
            document={
              <TransactionPdf
                transactions={transactions}
                searchedAddress={searchedAddress}
                avgPriceM2={avgPriceM2}
                avgPriceM2ICC={avgPriceM2ICC}
                searchCenter={searchCenter}
                mapImageUrl={mapImageUrl}
                urbanismeData={urbanismeData}
              />
            }
            fileName={`evaluation-dvf-${new Date().toISOString().split('T')[0]}.pdf`}
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm w-full md:w-auto justify-center"
            aria-label="Exporter les transactions en PDF"
          >
            {({ loading }) => (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{loading ? 'Génération...' : 'Export PDF'}</span>
              </>
            )}
          </PDFDownloadLink>
        );
      };
    }),
  { ssr: false, loading: () => <span className="text-gray-500 text-sm">Chargement PDF...</span> }
);

const FILTER_LABELS = { Maison: 'Maison', Appartement: 'Appart.', Local: 'Local comm.', Terrain: 'Terrain' };

export default function Toolbar({
  filters, onFiltersChange, radius, onRadiusChange,
  transactions, searchedAddress, avgPriceM2, avgPriceM2ICC,
  searchCenter, selectedCount, totalCount, mapImageUrl, sortConfig, onSort,
}) {
  const [urbanismeData, setUrbanismeData] = useState(null);

  useEffect(() => {
    if (!searchCenter?.lat || !searchCenter?.lon) { setUrbanismeData(null); return; }
    fetch(`/api/urbanisme?lat=${searchCenter.lat}&lng=${searchCenter.lon}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUrbanismeData(data))
      .catch(() => setUrbanismeData(null));
  }, [searchCenter?.lat, searchCenter?.lon]);

  const pluColor = urbanismeData?.typezone?.startsWith('U')
    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
    : urbanismeData?.typezone?.startsWith('A')
    ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
    : urbanismeData?.typezone?.startsWith('N')
    ? 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
    : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700';

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center md:justify-between">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 items-start sm:items-center flex-wrap w-full md:w-auto">

        {/* Filtres – toggle pills */}
        <div className="flex gap-2 items-center flex-wrap" role="group" aria-label="Filtres de type de bien">
          <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Filtres :</span>
          {Object.keys(filters).map((key) => (
            <button
              key={key}
              onClick={() => onFiltersChange({ ...filters, [key]: !filters[key] })}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                filters[key]
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
              aria-pressed={filters[key]}
              aria-label={`Filtrer par ${FILTER_LABELS[key] || key}`}
            >
              {FILTER_LABELS[key] || key}
            </button>
          ))}
        </div>

        {/* Rayon – pills arrondies */}
        <div className="flex gap-2 items-center flex-wrap" role="group" aria-label="Rayon de recherche">
          <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Rayon :</span>
          {[50, 100, 500, 1000].map((r) => (
            <button
              key={r}
              onClick={() => onRadiusChange(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                radius === r
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
              aria-pressed={radius === r}
              aria-label={`Rayon de ${r < 1000 ? r + 'm' : '1km'}`}
            >
              {r >= 1000 ? `${r / 1000}km` : `${r}m`}
            </button>
          ))}
        </div>

        {/* Tri */}
        {onSort && (
          <div className="flex gap-2 items-center flex-wrap" role="group" aria-label="Tri des résultats">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Tri :</span>
            {[{ key: 'date', label: 'Date' }, { key: 'address', label: 'Adresse' }, { key: 'price', label: 'Prix' }].map(({ key, label }) => {
              const active = sortConfig?.key === key;
              const dir = active ? sortConfig.direction : null;
              return (
                <button
                  key={key}
                  onClick={() => onSort(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
                    active ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }`}
                  aria-pressed={active}
                >
                  {label}
                  {dir === 'asc' ? (
                    <svg className="w-3 h-3 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7"/></svg>
                  ) : dir === 'desc' ? (
                    <svg className="w-3 h-3 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                  ) : (
                    <svg className="w-3 h-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Badge PLU */}
        {urbanismeData?.zone && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${pluColor}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0"></span>
            PLU : {urbanismeData.zone}
          </div>
        )}
      </div>

      {/* Export PDF */}
      {transactions.length > 0 && (
        <PdfErrorBoundary>
          <div className="flex flex-col items-end gap-1 shrink-0">
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
              mapImageUrl={mapImageUrl}
              urbanismeData={urbanismeData}
            />
          </div>
        </PdfErrorBoundary>
      )}
    </div>
  );
}
