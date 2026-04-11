'use client';

import { useState, useRef, useEffect } from 'react';

const HISTORY_KEY = 'dvf_search_history';
const MAX_HISTORY = 7;

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveToHistory(address, center) {
  try {
    const history = loadHistory().filter((h) => h.address !== address);
    history.unshift({ address, center, ts: Date.now() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {}
}

function removeFromHistory(address) {
  try {
    const history = loadHistory().filter((h) => h.address !== address);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {}
}

export default function SearchBar({ onSearch, loading }) {
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchCenter, setSearchCenter] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const debounceTimer = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Fermer le dropdown si clic en dehors
  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleAddressChange = (e) => {
    const val = e.target.value;
    setAddress(val);
    setSearchCenter(null);
    setShowHistory(false);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (val.length < 3) { setSuggestions([]); return; }
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(val)}&limit=5`);
        const data = await res.json();
        setSuggestions(data.features || []);
      } catch (err) { console.error(err); }
    }, 300);
  };

  const selectAddress = (feature) => {
    setAddress(feature.properties.label);
    setSearchCenter({ lon: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1] });
    setSuggestions([]);
    setShowHistory(false);
  };

  const handleSearch = async () => {
    if (!address) { alert('Veuillez entrer une adresse.'); return; }
    let center = searchCenter;
    if (!center) {
      try {
        const geoRes = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`);
        const geoData = await geoRes.json();
        if (!geoData.features?.length) { alert('Adresse introuvable'); return; }
        const coords = geoData.features[0].geometry.coordinates;
        center = { lon: coords[0], lat: coords[1] };
        setSearchCenter(center);
      } catch (err) { alert('Erreur lors du géocodage: ' + err.message); return; }
    }
    saveToHistory(address, center);
    setHistory(loadHistory());
    setShowHistory(false);
    onSearch(center, address);
  };

  const selectFromHistory = (item) => {
    setAddress(item.address);
    setSearchCenter(item.center);
    setSuggestions([]);
    setShowHistory(false);
    saveToHistory(item.address, item.center);
    setHistory(loadHistory());
    onSearch(item.center, item.address);
  };

  const deleteHistoryItem = (e, addr) => {
    e.stopPropagation();
    removeFromHistory(addr);
    setHistory(loadHistory());
  };

  const clearHistory = (e) => {
    e.stopPropagation();
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
    setHistory([]);
    setShowHistory(false);
  };

  const handleFocus = () => {
    if (!address && history.length > 0) {
      setShowHistory(true);
    }
  };

  const visibleHistory = history.filter((h) =>
    !address || h.address.toLowerCase().includes(address.toLowerCase())
  );

  const showHistoryDropdown = showHistory && visibleHistory.length > 0 && suggestions.length === 0;

  return (
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 mb-6 relative z-20">
      <div className="flex flex-col md:flex-row gap-3 md:gap-4 relative" ref={containerRef}>
        <div className="relative flex-1 w-full">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <input
            type="text"
            value={address}
            onChange={handleAddressChange}
            onFocus={handleFocus}
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleSearch()}
            placeholder="Entrez une adresse, ville ou code postal..."
            className="w-full pl-11 pr-4 py-3 sm:py-4 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-base sm:text-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
            aria-label="Rechercher une adresse"
            aria-autocomplete="list"
            aria-controls="address-suggestions"
            aria-expanded={suggestions.length > 0 || showHistoryDropdown}
          />

          {/* Suggestions d'autocomplétion */}
          {suggestions.length > 0 && (
            <ul id="address-suggestions" role="listbox" className="absolute left-0 right-0 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-b-lg shadow-xl mt-1 max-h-60 overflow-y-auto z-50">
              <li className="px-4 py-1.5 text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
                Suggestions
              </li>
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  onClick={() => selectAddress(s)}
                  role="option"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectAddress(s); }}
                  className="px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer border-b border-gray-100 dark:border-slate-800 last:border-0 text-gray-900 dark:text-white focus:bg-blue-50 dark:focus:bg-slate-700 outline-none flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <span className="text-sm">{s.properties.label}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Historique de recherche */}
          {showHistoryDropdown && (
            <ul role="listbox" className="absolute left-0 right-0 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-b-lg shadow-xl mt-1 max-h-72 overflow-y-auto z-50">
              <li className="px-4 py-1.5 flex items-center justify-between border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
                <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Recherches récentes</span>
                <button
                  onClick={clearHistory}
                  className="text-xs text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  Tout effacer
                </button>
              </li>
              {visibleHistory.map((item, i) => (
                <li
                  key={i}
                  onClick={() => selectFromHistory(item)}
                  role="option"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectFromHistory(item); }}
                  className="px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer border-b border-gray-100 dark:border-slate-800 last:border-0 text-gray-900 dark:text-white focus:bg-blue-50 dark:focus:bg-slate-700 outline-none flex items-center gap-2 group"
                >
                  <svg className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm flex-1 truncate">{item.address}</span>
                  <button
                    onClick={(e) => deleteHistoryItem(e, item.address)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-all ml-1 shrink-0"
                    aria-label="Supprimer de l'historique"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-label="Lancer la recherche"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Recherche...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              Rechercher
            </span>
          )}
        </button>
      </div>
      <p className="text-xs text-gray-400 dark:text-slate-500 mt-2 px-1">
        Appuyez sur{' '}
        <kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded">Entrée</kbd>{' '}
        ou cliquez sur Rechercher
      </p>
    </div>
  );
}
