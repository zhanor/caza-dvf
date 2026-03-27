'use client';

import { useState, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import StatsCards from './components/StatsCards';
import Toolbar from './components/Toolbar';
import TransactionTable from './components/TransactionTable';
import TransactionCards from './components/TransactionCards';
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
        distance: calculateDistance(center.lat, center.lon, t.latitude, t.longitude),
      }));

      setTransactions(formatted);
      setDeletedTransactions([]);
      setSearchedAddress(address || '');
      if (center) setSearchCenter(center);
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
    }
  };

  // Restauration
  const restoreTransaction = (id) => {
    const transaction = deletedTransactions.find((t) => t.id === id);
    if (transaction) {
      setDeletedTransactions((prev) => prev.filter((t) => t.id !== id));
      setTransactions((prev) => [...prev, transaction]);
    }
  };

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
    <div className="bg-gray-50 dark:bg-slate-950 min-h-screen text-gray-800 dark:text-white font-sans px-2 sm:px-4 md:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-slate-800 dark:text-white tracking-tight flex-1">
            <svg
              className="w-10 h-10 text-blue-600 mr-3 inline-block"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            CaZa DVF <span className="text-blue-600 text-lg align-top">PRO</span>
          </h1>
          <div className="flex items-center gap-3">
            <UserMenu />
            <DarkModeToggle darkMode={darkMode} onToggle={() => setDarkMode(!darkMode)} />
          </div>
        </div>

        {/* SearchBar */}
        <SearchBar onSearch={searchDVF} loading={loading} />

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

            {/* Toolbar */}
            <Toolbar
              filters={filters}
              onFiltersChange={setFilters}
              radius={radius}
              onRadiusChange={handleRadiusChange}
              transactions={sortedTransactions}
              searchedAddress={searchedAddress}
              avgPriceM2={avgPriceM2}
              avgPriceM2ICC={avgPriceM2ICC}
            />

            {/* Tableau Desktop */}
            <TransactionTable
              transactions={sortedTransactions}
              sortConfig={sortConfig}
              onSort={handleSort}
              onDelete={deleteTransaction}
            />

            {/* Cartes Mobile */}
            <TransactionCards transactions={sortedTransactions} onDelete={deleteTransaction} />

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
