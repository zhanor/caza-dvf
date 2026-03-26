'use client';

import { useState, useRef } from 'react';

/**
 * Composant barre de recherche avec autocomplétion
 */
export default function SearchBar({ onSearch, loading }) {
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchCenter, setSearchCenter] = useState(null);
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
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(val)}&limit=5`
        );
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
      lat: feature.geometry.coordinates[1],
    });
    setSuggestions([]);
  };

  const handleSearch = async () => {
    if (!address) {
      alert('Veuillez entrer une adresse.');
      return;
    }

    let center = searchCenter;

    // Géocodage si nécessaire
    if (!center) {
      try {
        const geoRes = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`
        );
        const geoData = await geoRes.json();
        if (!geoData.features?.length) {
          alert('Adresse introuvable');
          return;
        }
        const coords = geoData.features[0].geometry.coordinates;
        center = { lon: coords[0], lat: coords[1] };
        setSearchCenter(center);
      } catch (err) {
        alert('Erreur lors du géocodage: ' + err.message);
        return;
      }
    }

    // Appeler callback parent avec les coordonnées
    onSearch(center, address);
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 mb-6 relative z-20">
      <div className="flex flex-col md:flex-row gap-3 md:gap-4 relative">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={address}
            onChange={handleAddressChange}
            placeholder="Entrez une adresse..."
            className="w-full p-3 sm:p-4 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-base sm:text-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
            aria-label="Rechercher une adresse"
            aria-autocomplete="list"
            aria-controls="address-suggestions"
            aria-expanded={suggestions.length > 0}
          />
          {suggestions.length > 0 && (
            <ul
              id="address-suggestions"
              role="listbox"
              className="absolute left-0 right-0 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-b-lg shadow-xl mt-1 max-h-60 overflow-y-auto z-50"
            >
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  onClick={() => selectAddress(s)}
                  role="option"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      selectAddress(s);
                    }
                  }}
                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer border-b border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white focus:bg-blue-50 dark:focus:bg-slate-700 outline-none"
                >
                  {s.properties.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 sm:py-2 rounded-lg font-bold w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Lancer la recherche"
        >
          {loading ? 'Chargement...' : 'Voir'}
        </button>
      </div>
    </div>
  );
}
