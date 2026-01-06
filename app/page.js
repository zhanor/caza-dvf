'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import TransactionPdf from './components/TransactionPdf';

// Charger PDFDownloadLink uniquement côté client
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  { 
    ssr: false, 
    loading: () => <span className="text-gray-500">Chargement...</span>
  }
);

export default function Home() {
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [deletedTransactions, setDeletedTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchCenter, setSearchCenter] = useState(null);
  const [radius, setRadius] = useState(500); // Rayon par défaut 500m
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState({
    Maison: true,
    Appartement: true,
    Local: false,
    Terrain: false
  });
  const [darkMode, setDarkMode] = useState(false);

  // Gestion du Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  // Timer pour éviter de spammer l'API adresse
  const debounceTimer = useRef(null);

  // Gestion de l'autocomplétion
  const handleAddressChange = (e) => {
    const val = e.target.value;
    setAddress(val);
    
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (val.length < 3) {
      setSuggestions([]);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(val)}&limit=5`);
        const data = await res.json();
        setSuggestions(data.features || []);
      } catch (err) {
        console.error(err);
      }
    }, 300);
  };

  const selectAddress = (feature) => {
    setAddress(feature.properties.label);
    setSearchCenter({
      lon: feature.geometry.coordinates[0],
      lat: feature.geometry.coordinates[1]
    });
    setSuggestions([]);
  };

  // Formatage du cadastre
  const formatCadastre = (idParcelle) => {
    if (!idParcelle || typeof idParcelle !== 'string' || idParcelle.length !== 14) {
      return idParcelle || '-';
    }
    try {
      // Extraire la section (caractères 8 à 10, index 8-9)
      const section = idParcelle.substring(8, 10);
      // Extraire le numéro (caractères 10 à 14, index 10-13)
      const numeroRaw = idParcelle.substring(10, 14);
      // Enlever les zéros non significatifs
      const numero = parseInt(numeroRaw, 10).toString();
      return `${section} N°${numero}`;
    } catch (error) {
      return idParcelle;
    }
  };

  // Calcul de distance (Haversine)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // --- RECHERCHE ---
  const searchDVF = async (radiusOverride) => {
    // SÉCURITÉ : Si radiusOverride est un nombre, on l'utilise. Sinon on prend le state.
    const activeRadius = typeof radiusOverride === 'number' ? radiusOverride : radius;

    if (!address) return alert("Veuillez entrer une adresse.");
    setLoading(true);
    setSuggestions([]);

    try {
      let center = searchCenter;
      
      // Géocodage si nécessaire
      if (!center) {
        const geoRes = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`);
        const geoData = await geoRes.json();
        if (!geoData.features?.length) throw new Error("Adresse introuvable");
        const coords = geoData.features[0].geometry.coordinates;
        center = { lon: coords[0], lat: coords[1] };
        setSearchCenter(center);
      }

      console.log(`🔎 Recherche avec Rayon: ${activeRadius}m`);

      // Appel API avec le bon rayon
      const res = await fetch(`/api/search?lat=${center.lat}&lng=${center.lon}&radius=${activeRadius}`);
      const apiResponse = await res.json();

      if (apiResponse.error) throw new Error(apiResponse.error);

      // Nouvelle structure : apiResponse.data contient les transactions
      const data = apiResponse.data || apiResponse; // Rétrocompatibilité

      // Fonction pour nettoyer le type (retirer "Dépendance" si "Maison" ou "Appartement" présent)
      const cleanType = (typeStr) => {
        if (!typeStr) return null;
        
        // Si le type contient "Maison" ou "Appartement", on garde uniquement celui-ci
        if (typeStr.includes('Maison')) {
          return 'Maison';
        }
        if (typeStr.includes('Appartement')) {
          return 'Appartement';
        }
        
        // Sinon, on prend le premier élément (séparé par virgule)
        return typeStr.split(',')[0].trim();
      };

      const formatted = data.map(t => ({
        id: t.id_mutation || Math.random().toString(),
        date: new Date(t.date_mutation).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        dateRaw: new Date(t.date_mutation), // Pour le tri
        type: cleanType(t.type_local),
        address: `${t.adresse_numero || ''} ${t.adresse_nom_voie || ''}, ${t.nom_commune || ''}`,
        cadastre: t.id_parcelle && t.id_parcelle.length === 14 
          ? `${t.id_parcelle.substring(8, 10)} N°${parseInt(t.id_parcelle.substring(10, 14), 10)}`
          : t.id_parcelle || '-',
        surface: t.surface_reelle_bati || 0,
        terrain: t.surface_terrain || 0,
        price: t.valeur_fonciere || 0,
        distance: calculateDistance(center.lat, center.lon, t.latitude, t.longitude)
      }));

      setTransactions(formatted);
      setDeletedTransactions([]); // Réinitialiser la corbeille lors d'une nouvelle recherche

    } catch (err) {
      console.error(err);
      alert("Erreur: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtrage des données pour l'affichage (seulement les transactions actives)
  const filteredTransactions = transactions.filter(t => {
    if (!t.type) return false;
    const typeKey = Object.keys(filters).find(k => t.type.includes(k));
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
        aValue = a.surface > 0 ? (a.price / a.surface) : 0;
        bValue = b.surface > 0 ? (b.price / b.surface) : 0;
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
    
    return sortConfig.direction === 'asc' 
      ? aValue - bValue
      : bValue - aValue;
  });

  // Gestion du tri
  const handleSort = (key) => {
    if (sortConfig.key === key) {
      // Inverser l'ordre si on clique sur la même colonne
      setSortConfig({
        key,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      // Nouvelle colonne, tri ascendant par défaut
      setSortConfig({ key, direction: 'asc' });
    }
  };

  // Suppression (déplacer vers la corbeille)
  const deleteTransaction = (id) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      setDeletedTransactions(prev => [...prev, transaction]);
    }
  };

  // Restauration (retirer de la corbeille)
  const restoreTransaction = (id) => {
    const transaction = deletedTransactions.find(t => t.id === id);
    if (transaction) {
      setDeletedTransactions(prev => prev.filter(t => t.id !== id));
      setTransactions(prev => [...prev, transaction]);
    }
  };

  // --- GESTION DU RAYON ---
  const handleRadiusChange = (newRadius) => {
    setRadius(newRadius);
    // On lance la recherche immédiatement avec la nouvelle valeur
    if (searchCenter) {
      searchDVF(newRadius);
    }
  };

  // Calcul Stats
  const avgPriceM2 = filteredTransactions.reduce((acc, t) => {
    // Pour les terrains, on utilise la surface terrain, sinon la surface habitable
    const relevantSurface = t.type?.includes('Terrain') ? t.terrain : t.surface;
    return acc + (relevantSurface > 0 ? t.price / relevantSurface : 0);
  }, 0) / (filteredTransactions.length || 1);
  const avgSurface = filteredTransactions.reduce((acc, t) => acc + parseInt(t.surface||0), 0) / (filteredTransactions.length || 1);

  // Icône SVG pour le bouton supprimer
  const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );

  return (
    <div className="bg-gray-50 dark:bg-slate-950 min-h-screen text-gray-800 dark:text-white font-sans px-2 sm:px-4 md:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-slate-800 dark:text-white tracking-tight flex-1">
            <svg 
              className="w-10 h-10 text-blue-600 mr-3 inline-block" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
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
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-yellow-400 transition-all hover:scale-110"
            title={darkMode ? "Mode clair" : "Mode sombre"}
          >
            {darkMode ? (
              // Icône Soleil (Sun)
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              // Icône Lune (Moon)
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>

        {/* RECHERCHE */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 mb-6 relative z-20">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 relative">
            <div className="relative flex-1 w-full">
              <input 
                type="text" 
                value={address}
                onChange={handleAddressChange}
                placeholder="Entrez une adresse..." 
                className="w-full p-3 sm:p-4 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-base sm:text-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
              />
              {suggestions.length > 0 && (
                <ul className="absolute left-0 right-0 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-b-lg shadow-xl mt-1 max-h-60 overflow-y-auto z-50">
                  {suggestions.map((s, i) => (
                    <li key={i} onClick={() => selectAddress(s)} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer border-b border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white">
                      {s.properties.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button onClick={searchDVF} className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 sm:py-2 rounded-lg font-bold w-full md:w-auto">
              {loading ? '...' : 'Voir'}
            </button>
          </div>
        </div>

        {/* DASHBOARD (visible si des données sont chargées) */}
        {transactions.length > 0 && (
          <div className="animate-fade-in-down">
            {/* STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow border-l-4 border-blue-500">
                <p className="text-sm text-gray-500 dark:text-slate-400">Prix Moyen / m²</p>
                <p className="text-2xl font-bold dark:text-white">{Math.round(avgPriceM2)} €</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow border-l-4 border-green-500">
                <p className="text-sm text-gray-500 dark:text-slate-400">Biens affichés</p>
                <p className="text-2xl font-bold dark:text-white">{filteredTransactions.length}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow border-l-4 border-purple-500">
                <p className="text-sm text-gray-500 dark:text-slate-400">Surface Moyenne</p>
                <p className="text-2xl font-bold dark:text-white">{Math.round(avgSurface)} m²</p>
              </div>
            </div>

            {/* TOOLBAR (Filtres, Rayon, Export) */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 mb-6 flex flex-col md:flex-row gap-4 items-center md:justify-between">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center flex-wrap w-full md:w-auto">
                {/* Filtres */}
                <div className="flex gap-3 items-center flex-wrap justify-center md:justify-start">
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">Filtres :</span>
                  {Object.keys(filters).map(key => (
                    <label key={key} className="inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={filters[key]} 
                        onChange={e => setFilters({...filters, [key]: e.target.checked})}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-slate-700 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-slate-300">{key}</span>
                    </label>
                  ))}
                </div>
                
                {/* Rayon */}
                <div className="flex gap-2 items-center flex-wrap justify-center md:justify-start">
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">Rayon :</span>
                  {[50, 100, 500, 1000].map(r => (
                    <button
                      key={r}
                      onClick={() => handleRadiusChange(r)}
                      className={`px-3 py-2 sm:py-1 rounded text-sm font-medium transition-all ${
                        radius === r
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {r < 1000 ? `${r}m` : '1km'}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Bouton Export PDF */}
              {sortedTransactions.length > 0 && (
                <PDFDownloadLink
                  document={<TransactionPdf transactions={sortedTransactions} />}
                  fileName={`transactions-dvf-${new Date().toISOString().split('T')[0]}.pdf`}
                  className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm w-full md:w-auto justify-center"
                >
                  {({ loading }) => (
                    <>
                      <span>📄</span>
                      <span>{loading ? 'Génération...' : 'Export PDF'}</span>
                    </>
                  )}
                </PDFDownloadLink>
              )}
            </div>

            {/* TABLEAU - Desktop uniquement */}
            <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden mb-6">
              <div className="overflow-x-auto shadow-md sm:rounded-lg">
                <table className="w-full text-left">
                  <thead className="sticky top-0 z-10 backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-gray-200 dark:border-slate-800">
                  <tr>
                    <th 
                      className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => handleSort('date')}
                    >
                      Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => handleSort('type')}
                    >
                      Type {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => handleSort('address')}
                    >
                      Adresse {sortConfig.key === 'address' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase">Cadastre</th>
                    <th 
                      className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase text-right cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => handleSort('surface')}
                    >
                      Surf. Hab. {sortConfig.key === 'surface' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase text-right cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => handleSort('terrain')}
                    >
                      Surf. Ter. {sortConfig.key === 'terrain' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase text-right cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => handleSort('price')}
                    >
                      Prix {sortConfig.key === 'price' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase text-right cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => handleSort('priceM2')}
                    >
                      Prix/m² {sortConfig.key === 'priceM2' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase text-right cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => handleSort('distance')}
                    >
                      Dist. {sortConfig.key === 'distance' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-3 md:px-4 py-3 md:py-4 text-center font-bold text-gray-500 dark:text-slate-400 text-xs uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {sortedTransactions.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 even:bg-gray-50 dark:even:bg-slate-800/50 transition-colors">
                      <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-gray-600 dark:text-slate-300">{item.date}</td>
                      <td className="px-3 md:px-4 py-3 md:py-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold border ${
                          item.type?.includes('Maison') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                          item.type?.includes('Appartement') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          item.type?.includes('Local') ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                          item.type?.includes('Terrain') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {item.type || '-'}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-3 md:py-4 text-sm font-medium text-gray-900 dark:text-slate-300">{item.address}</td>
                      <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-gray-600 dark:text-slate-300 font-mono">{item.cadastre}</td>
                      <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-right text-gray-600 dark:text-slate-300 font-mono">{item.surface} m²</td>
                      <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-right text-gray-600 dark:text-slate-300 font-mono">{item.terrain > 0 ? `${item.terrain} m²` : '-'}</td>
                      <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-right font-bold text-gray-900 dark:text-slate-300 font-mono">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(item.price)}
                      </td>
                      <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-right text-blue-600 font-medium font-mono">
                        {(() => {
                          // 1. Détermine quelle surface utiliser
                          const isTerrain = item.type?.includes('Terrain');
                          const surfaceRef = isTerrain ? item.terrain : item.surface;
                          
                          // 2. Calcul du prix au m2
                          const pricePerSqm = (item.price && surfaceRef > 0) 
                            ? item.price / surfaceRef 
                            : 0;

                          // 3. Affichage
                          if (pricePerSqm === 0) return <span className="text-gray-400 dark:text-slate-500">-</span>;
                          
                          return (
                            <>
                              {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(pricePerSqm)} €/m²
                              {/* Petit indicateur visuel optionnel pour dire sur quoi on se base */}
                              <span className="text-xs text-gray-400 dark:text-slate-500 block font-sans">
                                sur {isTerrain ? 'terrain' : 'hab.'}
                              </span>
                            </>
                          );
                        })()}
                      </td>
                      <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-right text-gray-500 dark:text-slate-400 font-mono">{item.distance} m</td>
                      <td className="px-3 md:px-4 py-3 md:py-4 text-center">
                        <button 
                          onClick={() => deleteTransaction(item.id)} 
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors"
                          title="Supprimer"
                        >
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {sortedTransactions.length === 0 && (
                <div className="p-8 text-center text-gray-500 dark:text-slate-400">Aucun résultat avec ces filtres.</div>
              )}
            </div>

            {/* CARTES - Mobile uniquement */}
            <div className="block md:hidden mb-6">
              {sortedTransactions.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800">
                  Aucun résultat avec ces filtres.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {sortedTransactions.map(item => {
                    // Calcul du prix au m² pour l'affichage
                    const isTerrain = item.type?.includes('Terrain');
                    const surfaceRef = isTerrain ? item.terrain : item.surface;
                    const pricePerSqm = (item.price && surfaceRef > 0) ? item.price / surfaceRef : 0;
                    
                    // Couleur du badge selon le type
                    const badgeColor = item.type?.includes('Maison') 
                      ? 'text-emerald-700' 
                      : item.type?.includes('Appartement') 
                      ? 'text-blue-700' 
                      : item.type?.includes('Local') 
                      ? 'text-purple-700' 
                      : item.type?.includes('Terrain') 
                      ? 'text-amber-700' 
                      : 'text-gray-700';

                    return (
                      <div 
                        key={item.id} 
                        className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-4"
                      >
                        {/* Ligne 1 : Type (gauche) + Prix + Prix/m² (droite) */}
                        <div className="flex justify-between items-start mb-2">
                          <span className={`font-bold text-sm ${badgeColor}`}>
                            {item.type || '-'}
                          </span>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900 dark:text-slate-100">
                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(item.price)}
                            </div>
                            {(() => {
                              // Calcul du prix au m² (même logique que le tableau)
                              const isTerrain = item.type?.includes('Terrain');
                              const surfaceRef = isTerrain ? item.terrain : item.surface;
                              const pricePerSqm = (item.price && surfaceRef > 0) 
                                ? item.price / surfaceRef 
                                : 0;
                              
                              if (pricePerSqm === 0) return null;
                              
                              return (
                                <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                                  {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(pricePerSqm)} € / m²
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Ligne 2 : Adresse + Distance */}
                        <div className="flex justify-between items-start text-sm text-gray-700 dark:text-slate-300 mb-3">
                          <div className="flex-1">
                            {item.address}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-400 ml-2 whitespace-nowrap">
                            📍 {item.distance} m
                          </div>
                        </div>

                        {/* Ligne 3 : Surfaces */}
                        <div className="flex gap-4 text-xs text-gray-600 dark:text-slate-400 mb-3">
                          <span>Hab: {item.surface} m²</span>
                          {item.terrain > 0 && (
                            <span>Ter: {item.terrain} m²</span>
                          )}
                        </div>

                        {/* Ligne 4 : Date + Cadastre + Action */}
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex gap-3 items-center">
                            <span className="text-gray-600 dark:text-slate-400">{item.date}</span>
                            <span className="text-gray-400 dark:text-slate-500 font-mono">{item.cadastre}</span>
                          </div>
                          <button 
                            onClick={() => deleteTransaction(item.id)} 
                            className="text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded transition-colors"
                            title="Supprimer"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CORBEILLE / ÉLÉMENTS IGNORÉS */}
            {deletedTransactions.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
                <h2 className="p-4 bg-gray-100 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-800 font-bold text-gray-700 dark:text-slate-300 tracking-tight">🗑️ Corbeille / Éléments ignorés</h2>
                <div className="overflow-x-auto shadow-md sm:rounded-lg">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-800">
                      <tr>
                        <th className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase">Date</th>
                        <th className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase">Type</th>
                        <th className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase">Adresse</th>
                        <th className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase">Cadastre</th>
                        <th className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase text-right">Surf. Hab.</th>
                        <th className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase text-right">Surf. Ter.</th>
                        <th className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase text-right">Prix</th>
                        <th className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase text-right">Prix/m²</th>
                        <th className="px-3 md:px-4 py-3 md:py-4 font-bold text-gray-500 dark:text-slate-400 text-xs uppercase text-right">Dist.</th>
                        <th className="px-3 md:px-4 py-3 md:py-4 text-center font-bold text-gray-500 dark:text-slate-400 text-xs uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {deletedTransactions.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 opacity-75 transition-colors">
                          <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-gray-600 dark:text-slate-300">{item.date}</td>
                          <td className="px-3 md:px-4 py-3 md:py-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold border ${
                              item.type?.includes('Maison') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                              item.type?.includes('Appartement') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              item.type?.includes('Local') ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                              item.type?.includes('Terrain') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-gray-50 text-gray-700 border-gray-200'
                            }`}>
                              {item.type || '-'}
                            </span>
                          </td>
                          <td className="px-3 md:px-4 py-3 md:py-4 text-sm font-medium text-gray-900 dark:text-slate-300">{item.address}</td>
                          <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-gray-600 dark:text-slate-300 font-mono">{item.cadastre}</td>
                          <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-right text-gray-600 dark:text-slate-300 font-mono">{item.surface} m²</td>
                          <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-right text-gray-600 dark:text-slate-300 font-mono">{item.terrain > 0 ? `${item.terrain} m²` : '-'}</td>
                          <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-right font-bold text-gray-900 dark:text-slate-300 font-mono">
                            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(item.price)}
                          </td>
                          <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-right text-blue-600 font-medium font-mono">
                            {item.surface > 0 ? `${Math.round(item.price / item.surface).toLocaleString('fr-FR')} €/m²` : '-'}
                          </td>
                          <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-right text-gray-500 dark:text-slate-400 font-mono">{item.distance} m</td>
                          <td className="px-3 md:px-4 py-3 md:py-4 text-center">
                            <button 
                              onClick={() => restoreTransaction(item.id)} 
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
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