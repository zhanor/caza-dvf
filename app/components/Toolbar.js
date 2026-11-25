'use client';

import { useState, useEffect } from 'react';

const FILTER_LABELS = { Maison: 'Maison', Appartement: 'Appart.', Local: 'Local comm.', Terrain: 'Terrain' };

export default function Toolbar({
  filters, onFiltersChange, radius, onRadiusChange,
  transactions, searchedAddress, avgPriceM2, avgPriceM2ICC,
  searchCenter, selectedCount, totalCount, getMapImage, sortConfig, onSort,
  iccData, maxDependances, onMaxDependancesChange,
}) {
  const [urbanismeData, setUrbanismeData] = useState(null);
  const [indicesData, setIndicesData] = useState(null);
  const [pdfEnCours, setPdfEnCours] = useState(false);
  const [pdfErreur, setPdfErreur] = useState(false);

  // Le PDF n'est produit qu'au clic : la bibliothèque (lourde) est chargée à ce moment-là,
  // la carte est capturée dans son état courant, puis le fichier est téléchargé.
  // Auparavant le document était régénéré à chaque changement d'état de la page.
  const exporterPdf = async () => {
    if (pdfEnCours) return;
    setPdfEnCours(true);
    setPdfErreur(false);
    try {
      const [{ pdf }, { default: TransactionPdf }, mapImageUrl] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./TransactionPdf'),
        Promise.resolve(getMapImage?.()).catch(() => null),
      ]);
      const blob = await pdf(
        <TransactionPdf
          transactions={transactions}
          searchedAddress={searchedAddress}
          avgPriceM2={avgPriceM2}
          avgPriceM2ICC={avgPriceM2ICC}
          searchCenter={searchCenter}
          mapImageUrl={mapImageUrl || null}
          urbanismeData={urbanismeData}
          indicesData={indicesData}
          iccData={iccData}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = `evaluation-dvf-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error('Export PDF :', err);
      setPdfErreur(true);
    } finally {
      setPdfEnCours(false);
    }
  };

  useEffect(() => {
    if (!searchCenter?.lat || !searchCenter?.lon) { setUrbanismeData(null); return; }
    fetch(`/api/urbanisme?lat=${searchCenter.lat}&lng=${searchCenter.lon}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUrbanismeData(data))
      .catch(() => setUrbanismeData(null));
  }, [searchCenter?.lat, searchCenter?.lon]);

  useEffect(() => {
    if (!searchCenter?.lat || !searchCenter?.lon) { setIndicesData(null); return; }
    fetch(`/api/indices?lat=${searchCenter.lat}&lng=${searchCenter.lon}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setIndicesData(data))
      .catch(() => setIndicesData(null));
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
        <div className="flex gap-2 items-center flex-wrap sm:pl-5 sm:border-l sm:border-gray-200 sm:dark:border-slate-700" role="group" aria-label="Rayon de recherche">
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

        {/* Dépendances incluses dans le prix — « tous » par défaut */}
        {onMaxDependancesChange && (
          <div
            className="flex gap-2 items-center flex-wrap sm:pl-5 sm:border-l sm:border-gray-200 sm:dark:border-slate-700"
            role="group"
            aria-label="Filtre sur le nombre de dépendances"
          >
            <span
              className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide"
              title="Les dépendances (cave, parking, chambre de service) sont incluses dans le prix sans être ventilées. Il n'existe pas de seuil normé : à vous de choisir."
            >
              Dépendances :
            </span>
            {[
              { valeur: null, libelle: 'Tous' },
              { valeur: 0, libelle: 'Aucune' },
              { valeur: 1, libelle: '≤ 1' },
              { valeur: 2, libelle: '≤ 2' },
              { valeur: 5, libelle: '≤ 5' },
            ].map(({ valeur, libelle }) => (
              <button
                key={libelle}
                onClick={() => onMaxDependancesChange(valeur)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  maxDependances === valeur
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
                aria-pressed={maxDependances === valeur}
              >
                {libelle}
              </button>
            ))}
          </div>
        )}

        {/* Tri */}
        {onSort && (
          <div className="flex gap-2 items-center flex-wrap sm:pl-5 sm:border-l sm:border-gray-200 sm:dark:border-slate-700" role="group" aria-label="Tri des résultats">
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
        <div className="flex flex-col items-end gap-1 shrink-0">
          {selectedCount !== undefined && (
            <span className="text-xs text-gray-500 dark:text-slate-400">
              {selectedCount}/{totalCount} sélectionnée{selectedCount > 1 ? 's' : ''}
            </span>
          )}
          <button
            type="button"
            onClick={exporterPdf}
            disabled={pdfEnCours}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm w-full md:w-auto justify-center"
            aria-label="Exporter les transactions en PDF"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{pdfEnCours ? 'Génération...' : 'Export PDF'}</span>
          </button>
          {pdfErreur && (
            <span className="text-xs text-red-600 dark:text-red-400" role="alert">
              L’export a échoué, réessayez.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
