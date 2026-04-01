'use client';

import { useState, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import StatsCards from './components/StatsCards';
import Toolbar from './components/Toolbar';
import TransactionTable from './components/TransactionTable';
import TransactionCards from './components/TransactionCards';
import MapView from './components/MapView';
import UserMenu from './components/UserMenu';
import DarkModeToggle from './components/DarkModeToggle';
import { actualiserPrixICC, needsActualization } from '../lib/icc';

export default function Home() {
  const [transactions, setTransactions] = useState([]);
  const [deletedTransactions, setDeletedTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(500);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState({
    Maison: true,
    Appartement: true,
    Local: false,
    Terrain: false,
  });
  const [darkMode, setDarkMode] = useState(false);
  const [searchedAddress, setSearchedAddress] = useState('');
  const [searchCenter, setSearchCenter] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [mapImageUrl, setMapImageUrl] = useState(null);

  // Gestion du Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Calcul de distance (Haversine)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // Fonction pour nettoyer le type
  const cleanType = (typeStr) => {
    if (!typeStr) return null;
    if (typeStr.includes('Maison')) return 'Maison';
    if (typeStr.includes('Appartement')) return 'Appartement';
    return typeStr.split(',')[0].trim();
  };

  // Recherche DVF
  const searchDVF = async (center, address, radiusOverride) => {
    const activeRadius = typeof radiusOverride === 'number' ? radiusOverride : radius;

    setLoading(true);

    try {
      console.log(`🔎 Recherche avec Rayon: ${activeRadius}m`);

      const res = await fetch(
        `/api/search?lat=${center.lat}&lng=${center.lon}&radius=${activeRadius}`
      );
      const apiResponse = await res.json();

      if (apiResponse.error) throw new Error(apiResponse.error);

      const data = apiResponse.data || apiResponse;

      const formatted = data.map((t) => ({
        id: t.id_mutation || Math.random().toString(),
        date: new Date(t.date_mutation).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
        dateRaw: new Date(t.date_mutation),
        type: cleanType(t.type_local),
        address: `${t.adresse_numero || ''} ${t.adresse_nom_voie || ''}, ${t.nom_commune || ''}`,
        cadastre:
          t.id_parcelle && t.id_parcelle.length === 14
            ? `${t.id_parcelle.substring(8, 10)} N°${parseInt(
                t.id_parcelle.substring(10, 14),
                10
              )}`
            : t.id_parcelle || '-',
        surface: t.surface_reelle_bati || 0,
        terrain: t.surface_terrain || 0,
        price: t.valeur_fonciere || 0,
        constructible: t.nature_mutation === 'Vente terrain à bâtir' ? true : null,
        distance: calculateDistance(center.lat, center.lon, t.latitude, t.longitude),
        lat: t.latitude || null,
        lng: t.longitude || null,
      }));

      setTransactions(formatted);
      setDeletedTransactions([]);
      setSelectedIds(new Set(formatted.map(t => t.id)));
      setMapImageUrl(null);
      setSearchedAddress(address || '');
      if (center) setSearchCenter(center);

      // Fetch PLU zone for terrain transactions without DVF constructibility info
      const terrains = formatted.filter(t => t.type?.includes('Terrain') && t.constructible === null && t.lat && t.lng);
      console.log('[PLU] terrains à enrichir:', terrains.length, terrains.map(t => ({ id: t.id, lat: t.lat, lng: t.lng })));
      if (terrains.length > 0) {
        Promise.all(
          terrains.map(t =>
            fetch(`/api/urbanisme?lat=${t.lat}&lng=${t.lng}`)
              .then(r => r.ok ? r.json() : null)
              .then(data => { console.log('[PLU]', t.lat, t.lng, '->', data); return { id: t.id, data }; })
              .catch(err => { console.error('[PLU] erreur', err); return { id: t.id, data: null }; })
          )
        ).then(results => {
          setTransactions(prev => prev.map(t => {
            const result = results.find(r => r.id === t.id);
            if (!result?.data?.typezone) return t;
            const tz = result.data.typezone;
            const constructible = tz.startsWith('AU') || tz.startsWith('U') ? true
              : tz.startsWith('A') || tz.startsWith('N') ? false
              : null;
            return { ...t, constructible, zoneUrba: result.data.zone };
          }));
        });
      }
    } catch (err) {
      console.error(err);
      alert('Erreur: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Gestion du rayon
  const handleRadiusChange = (newRadius) => {
    setRadius(newRadius);
    if (searchCenter) {
      searchDVF(searchCenter, searchedAddress, newRadius);
    }
  };

  // Filtrage des transactions
  const filteredTransactions = transactions.filter((t) => {
    if (!t.type) return false;
    const typeKey = Object.keys(filters).find((k) => t.type.includes(k));
    return typeKey ? filters[typeKey] : false;
  });

  // Tri des transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue, bValue;
    switch (sortConfig.key) {
      case 'date':
        aValue = a.dateRaw?.getTime() || 0;
        bValue = b.dateRaw?.getTime() || 0;
        break;
      case 'type':
        aValue = a.type || '';
        bValue = b.type || '';
        break;
      case 'address':
        aValue = a.address?.toLowerCase() || '';
        bValue = b.address?.toLowerCase() || '';
        break;
      case 'surface':
        aValue = a.surface || 0;
        bValue = b.surface || 0;
        break;
      case 'terrain':
        aValue = a.terrain || 0;
        bValue = b.terrain || 0;
        break;
      case 'price':
        aValue = a.price || 0;
        bValue = b.price || 0;
        break;
      case 'priceM2':
        aValue = a.surface > 0 ? a.price / a.surface : 0;
        bValue = b.surface > 0 ? b.price / b.surface : 0;
        break;
      case 'distance':
        aValue = a.distance || 0;
        bValue = b.distance || 0;
        break;
      default:
        return 0;
    }

    if (typeof aValue === 'string') {
      return sortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
  });

  // Gestion du tri
  const handleSort = (key) => {
    if (sortConfig.key === key) {
      setSortConfig({
        key,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      setSortConfig({ key, direction: 'asc' });
    }
  };

  // Suppression
  const deleteTransaction = (id) => {
    const transaction = transactions.find((t) => t.id === id);
    if (transaction) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      setDeletedTransactions((prev) => [...prev, transaction]);
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  // Sélection / déselection
  const toggleSelection = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Restauration
  const restoreTransaction = (id) => {
    const transaction = deletedTransactions.find((t) => t.id === id);
    if (transaction) {
      setDeletedTransactions((prev) => prev.filter((t) => t.id !== id));
      setTransactions((prev) => [...prev, transaction]);
    }
  };

  // Numérotation des références
  const numberedTransactions = sortedTransactions.map((t, i) => ({ ...t, refNum: i + 1 }));
  // selectedTransactions renumérotés 1..N selon la vue courante
  const selectedTransactions = numberedTransactions
    .filter(t => selectedIds.has(t.id))
    .map((t, i) => ({ ...t, refNum: i + 1 }));
  // Map id → nouveau refNum pour les marqueurs carte
  const refNumMap = new Map(selectedTransactions.map(t => [t.id, t.refNum]));

  // Calcul Stats
  const avgPriceM2 =
    filteredTransactions.reduce((acc, t) => {
      const relevantSurface = t.type?.includes('Terrain') ? t.terrain : t.surface;
      return acc + (relevantSurface > 0 ? t.price / relevantSurface : 0);
    }, 0) / (filteredTransactions.length || 1);

  const avgPriceM2ICC =
    filteredTransactions.reduce((acc, t) => {
      const relevantSurface = t.type?.includes('Terrain') ? t.terrain : t.surface;
      if (relevantSurface <= 0) return acc;
      if (t.dateRaw && needsActualization(t.dateRaw)) {
        const icc = actualiserPrixICC(t.price, t.dateRaw);
        return acc + (icc ? icc.prixActualise / relevantSurface : t.price / relevantSurface);
      }
      return acc + t.price / relevantSurface;
    }, 0) / (filteredTransactions.length || 1);

  const avgSurface =
    filteredTransactions.reduce((acc, t) => acc + parseInt(t.surface || 0, 10), 0) /
    (filteredTransactions.length || 1);

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-white font-sans px-3 sm:px-5 md:px-8 py-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                CaZa DVF
              </h1>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-none">
                Pro
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <UserMenu />
            <DarkModeToggle darkMode={darkMode} onToggle={() => setDarkMode(!darkMode)} />
          </div>
        </div>

        {/* SearchBar */}
        <SearchBar onSearch={searchDVF} loading={loading} />

        {/* Empty state */}
        {transactions.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
              Recherchez un bien immobilier
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
              Entrez une adresse pour consulter les transactions DVF dans un rayon jusqu'à 1 km
            </p>
          </div>
        )}

        {/* Dashboard (visible si des données sont chargées) */}
        {transactions.length > 0 && (
          <div className="animate-fade-in-down">
            {/* Stats */}
            <StatsCards
              avgPriceM2={avgPriceM2}
              avgPriceM2ICC={avgPriceM2ICC}
              count={filteredTransactions.length}
              avgSurface={avgSurface}
            />

            {/* Carte interactive */}
            <MapView
              transactions={numberedTransactions}
              searchCenter={searchCenter}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelection}
              onCapture={setMapImageUrl}
              onViewportChange={setSelectedIds}
refNumMap={refNumMap}
            />

            {/* Toolbar */}
            <Toolbar
              filters={filters}
              onFiltersChange={setFilters}
              radius={radius}
              onRadiusChange={handleRadiusChange}
              transactions={selectedTransactions}
              searchedAddress={searchedAddress}
              avgPriceM2={avgPriceM2}
              avgPriceM2ICC={avgPriceM2ICC}
              searchCenter={searchCenter}
              selectedCount={selectedTransactions.length}
              totalCount={numberedTransactions.length}
              mapImageUrl={mapImageUrl}
              sortConfig={sortConfig}
              onSort={handleSort}
            />

            {/* Tableau Desktop */}
            <TransactionTable
              transactions={selectedTransactions}
              sortConfig={sortConfig}
              onSort={handleSort}
              onDelete={deleteTransaction}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelection}
            />

            {/* Cartes Mobile */}
            <TransactionCards
              transactions={selectedTransactions}
              onDelete={deleteTransaction}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelection}
            />

            {/* Corbeille */}
            {deletedTransactions.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
                <h2 className="p-4 bg-gray-100 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-800 font-bold text-gray-700 dark:text-slate-300 tracking-tight">
                  🗑️ Corbeille / Éléments ignorés
                </h2>
                <div className="overflow-x-auto shadow-md sm:rounded-lg">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-800">
                      <tr>
                        <th className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase">
                          Date
                        </th>
                        <th className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase">
                          Type
                        </th>
                        <th className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase">
                          Adresse
                        </th>
                        <th className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase">
                          Prix
                        </th>
                        <th className="px-3 md:px-4 py-3 md:py-4 text-center font-bold text-gray-500 dark:text-slate-400 text-xs uppercase">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {deletedTransactions.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-gray-50 dark:hover:bg-slate-800/50 opacity-75 transition-colors"
                        >
                          <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-gray-600 dark:text-slate-300">
                            {item.date}
                          </td>
                          <td className="px-3 md:px-4 py-3 md:py-4 text-sm">{item.type}</td>
                          <td className="px-3 md:px-4 py-3 md:py-4 text-sm font-medium text-gray-900 dark:text-slate-300">
                            {item.address}
                          </td>
                          <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-right font-bold">
                            {new Intl.NumberFormat('fr-FR', {
                              style: 'currency',
                              currency: 'EUR',
                              maximumFractionDigits: 0,
                            }).format(item.price)}
                          </td>
                          <td className="px-3 md:px-4 py-3 md:py-4 text-center">
                            <button
                              onClick={() => restoreTransaction(item.id)}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                              aria-label={`Restaurer la transaction ${item.address}`}
                            >
                              Restaurer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
