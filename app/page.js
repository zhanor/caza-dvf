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
  const [errorMsg, setErrorMsg] = useState('');
  // Dossier d'expertise courant ({id, nom}) et notes par comparable {id_mutation: note}
  const [dossier, setDossier] = useState(null);
  const [notes, setNotes] = useState({});
  const [savingDossier, setSavingDossier] = useState(false);
  const [dossierMsg, setDossierMsg] = useState('');
  const [searchCenter, setSearchCenter] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [mapImageUrl, setMapImageUrl] = useState(null);
  const [iccData, setIccData] = useState(null); // { series, latest } — voir /api/icc

  // Récupération de l'indice ICC (INSEE) une seule fois au chargement
  useEffect(() => {
    fetch('/api/icc')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setIccData(data))
      .catch(() => setIccData(null));
  }, []);

  // Initialisation du Dark Mode (localStorage, sinon préférence système)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dvf_dark_mode');
      if (saved !== null) setDarkMode(saved === '1');
      else setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch {}
  }, []);

  // Gestion du Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try { localStorage.setItem('dvf_dark_mode', darkMode ? '1' : '0'); } catch {}
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

  // Recherche DVF — retourne la liste formatée (utilisé par la réouverture de dossier)
  const searchDVF = async (center, address, radiusOverride, options = {}) => {
    const activeRadius = typeof radiusOverride === 'number' ? radiusOverride : radius;

    setLoading(true);
    setErrorMsg('');

    try {
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
        adresseNumero: t.adresse_numero || '',
        adresseVoie: t.adresse_nom_voie || '',
        codePostal: t.code_postal || '',
        cadastre:
          t.id_parcelle && t.id_parcelle.length === 14
            ? `${t.id_parcelle.substring(8, 10)} N°${parseInt(
                t.id_parcelle.substring(10, 14),
                10
              )}`
            : t.id_parcelle || '-',
        surface: t.surface_reelle_bati ? Math.round(parseFloat(t.surface_reelle_bati)) : 0,
        terrain: t.surface_terrain ? Math.round(parseFloat(t.surface_terrain)) : 0,
        price: t.valeur_fonciere ? parseFloat(t.valeur_fonciere) : 0,
        constructible: t.nature_mutation === 'Vente terrain à bâtir' ? true : null,
        distance: calculateDistance(center.lat, center.lon, t.latitude, t.longitude),
        lat: t.latitude ? parseFloat(t.latitude) : null,
        lng: t.longitude ? parseFloat(t.longitude) : null,
      }));

      setTransactions(formatted);
      setDeletedTransactions([]);
      setSelectedIds(new Set(formatted.map(t => t.id)));
      setMapImageUrl(null);
      setSearchedAddress(address || '');
      if (center) setSearchCenter(center);
      if (!options.keepDossier) { setDossier(null); setNotes({}); }

      // Enrichissement SIRENE pour les locaux commerciaux
      const locaux = formatted.filter(t => t.type?.includes('Local') && t.adresseVoie && t.codePostal);
      if (locaux.length > 0) {
        Promise.all(
          locaux.map(t =>
            fetch(`/api/sirene?num=${encodeURIComponent(t.adresseNumero)}&voie=${encodeURIComponent(t.adresseVoie)}&cp=${encodeURIComponent(t.codePostal)}`)
              .then(r => r.ok ? r.json() : null)
              .then(data => ({ id: t.id, activite: data?.activite || null }))
              .catch(() => ({ id: t.id, activite: null }))
          )
        ).then(results => {
          setTransactions(prev => prev.map(t => {
            const r = results.find(r => r.id === t.id);
            return r?.activite ? { ...t, activiteSirene: r.activite } : t;
          }));
        });
      }

      // Fetch PLU zone for terrain transactions without DVF constructibility info
      const terrains = formatted.filter(t => t.type?.includes('Terrain') && t.constructible === null && t.lat && t.lng);
      if (terrains.length > 0) {
        Promise.all(
          terrains.map(t =>
            fetch(`/api/urbanisme?lat=${t.lat}&lng=${t.lng}`, { cache: 'no-store' })
              .then(r => r.ok ? r.json() : null)
              .then(data => ({ id: t.id, data }))
              .catch(() => ({ id: t.id, data: null }))
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
      return formatted;
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Erreur lors de la recherche');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Gestion du rayon (conserve le lien au dossier courant)
  const handleRadiusChange = (newRadius) => {
    setRadius(newRadius);
    if (searchCenter) {
      searchDVF(searchCenter, searchedAddress, newRadius, { keepDossier: true });
    }
  };

  // ----- Dossiers d'expertise -----

  // Snapshot d'un comparable pour la sauvegarde (traçabilité)
  const snapshotOf = (t) => ({
    id: t.id, date: t.date, dateRaw: t.dateRaw?.toISOString() || null, type: t.type,
    address: t.address, adresseNumero: t.adresseNumero, adresseVoie: t.adresseVoie,
    codePostal: t.codePostal, cadastre: t.cadastre, surface: t.surface, terrain: t.terrain,
    price: t.price, distance: t.distance, lat: t.lat, lng: t.lng,
    constructible: t.constructible ?? null, zoneUrba: t.zoneUrba || null,
    activiteSirene: t.activiteSirene || null,
  });

  // Reconstruit un comparable affichable depuis un snapshot (donnée archivée)
  const fromSnapshot = (snap) => ({
    ...snap,
    dateRaw: snap.dateRaw ? new Date(snap.dateRaw) : null,
    archived: true,
  });

  const saveDossier = async () => {
    if (!searchCenter || transactions.length + deletedTransactions.length === 0) return;
    let nom = dossier?.nom;
    if (!dossier) {
      nom = prompt('Nom du dossier d’expertise :', searchedAddress || 'Nouveau dossier');
      if (!nom || !nom.trim()) return;
    }
    setSavingDossier(true);
    setDossierMsg('');
    try {
      const comparables = [
        ...transactions.map((t) => ({
          id_mutation: t.id,
          statut: selectedIds.has(t.id) ? 'retenu' : 'ecarte',
          note: notes[t.id] || null,
          snapshot: snapshotOf(t),
        })),
        ...deletedTransactions.map((t) => ({
          id_mutation: t.id,
          statut: 'exclu',
          note: notes[t.id] || null,
          snapshot: snapshotOf(t),
        })),
      ];
      const payload = {
        nom: nom.trim(),
        adresse_bien: searchedAddress,
        lat: searchCenter.lat,
        lng: searchCenter.lon,
        radius,
        filtres: filters,
        comparables,
      };
      const res = await fetch(dossier ? `/api/dossiers/${dossier.id}` : '/api/dossiers', {
        method: dossier ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de sauvegarde');
      if (!dossier && data.dossier) setDossier({ id: data.dossier.id, nom: data.dossier.nom });
      setDossierMsg('Dossier enregistré');
      setTimeout(() => setDossierMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Erreur lors de la sauvegarde du dossier');
    } finally {
      setSavingDossier(false);
    }
  };

  // Réouverture d'un dossier via /?dossier=ID
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('dossier');
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/dossiers/${id}`);
        if (!res.ok) throw new Error('Dossier introuvable');
        const d = await res.json();

        setRadius(d.radius || 500);
        if (d.filtres && Object.keys(d.filtres).length > 0) setFilters(d.filtres);

        const center = { lat: parseFloat(d.lat), lon: parseFloat(d.lng) };
        const formatted = await searchDVF(center, d.adresse_bien, d.radius || 500, { keepDossier: true });

        // Réapplication des statuts sauvegardés
        const saved = new Map(d.comparables.map((c) => [c.id_mutation, c]));
        const foundIds = new Set(formatted.map((t) => t.id));
        const kept = [];
        const excluded = [];
        const selected = new Set();

        for (const t of formatted) {
          const c = saved.get(t.id);
          if (!c) { kept.push(t); continue; } // nouvelle vente apparue depuis la sauvegarde : visible, décochée
          if (c.statut === 'exclu') excluded.push(t);
          else {
            kept.push(t);
            if (c.statut === 'retenu') selected.add(t.id);
          }
        }
        // Comparables sauvegardés absents des données actuelles → restaurés depuis le snapshot
        for (const c of d.comparables) {
          if (foundIds.has(c.id_mutation) || c.statut === 'exclu') continue;
          const restored = fromSnapshot(c.snapshot);
          kept.push(restored);
          if (c.statut === 'retenu') selected.add(restored.id);
        }

        setTransactions(kept);
        setDeletedTransactions(excluded);
        setSelectedIds(selected);
        setNotes(Object.fromEntries(d.comparables.filter((c) => c.note).map((c) => [c.id_mutation, c.note])));
        setDossier({ id: d.id, nom: d.nom });
      } catch (err) {
        setErrorMsg(err.message || 'Impossible de rouvrir le dossier');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editNote = (id) => {
    const current = notes[id] || '';
    const next = prompt('Note sur ce comparable :', current);
    if (next === null) return;
    setNotes((prev) => {
      const copy = { ...prev };
      if (next.trim()) copy[id] = next.trim();
      else delete copy[id];
      return copy;
    });
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
        aValue = (a.address?.toLowerCase() || '').replace(/^\d+\s*/, '');
        bValue = (b.address?.toLowerCase() || '').replace(/^\d+\s*/, '');
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
  const selectedForStats = filteredTransactions.filter(t => selectedIds.has(t.id));

  const validPriceM2Count = selectedForStats.filter(t => {
    const s = t.type?.includes('Terrain') ? t.terrain : t.surface;
    return s > 0;
  }).length;
  const avgPriceM2 =
    selectedForStats.reduce((acc, t) => {
      const relevantSurface = t.type?.includes('Terrain') ? t.terrain : t.surface;
      return acc + (relevantSurface > 0 ? t.price / relevantSurface : 0);
    }, 0) / (validPriceM2Count || 1);

  const avgPriceM2ICC =
    selectedForStats.reduce((acc, t) => {
      const relevantSurface = t.type?.includes('Terrain') ? t.terrain : t.surface;
      if (relevantSurface <= 0) return acc;
      if (t.dateRaw && needsActualization(t.dateRaw)) {
        const icc = actualiserPrixICC(t.price, t.dateRaw, iccData?.series, iccData?.latest);
        return acc + (icc ? icc.prixActualise / relevantSurface : t.price / relevantSurface);
      }
      return acc + t.price / relevantSurface;
    }, 0) / (validPriceM2Count || 1);

  const surfaceTransactions = selectedForStats.filter(t => t.surface > 0);
  const avgSurface =
    surfaceTransactions.reduce((acc, t) => acc + parseInt(t.surface, 10), 0) /
    (surfaceTransactions.length || 1);

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
            <a
              href="/dossiers"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
              title="Mes dossiers d'expertise"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Dossiers</span>
            </a>
            <UserMenu />
            <DarkModeToggle darkMode={darkMode} onToggle={() => setDarkMode(!darkMode)} />
          </div>
        </div>

        {/* SearchBar */}
        <SearchBar onSearch={searchDVF} loading={loading} />

        {/* Message d'erreur */}
        {errorMsg && (
          <div className="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3 mb-6" role="alert">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="shrink-0 hover:text-red-900 dark:hover:text-red-200 transition-colors" aria-label="Fermer le message d'erreur">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

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
            {/* Bandeau dossier courant */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                {dossier ? (
                  <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-sm font-medium truncate">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m-3 0h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                    </svg>
                    <span className="truncate">Dossier : {dossier.nom}</span>
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 dark:text-slate-500">Recherche non enregistrée</span>
                )}
                {dossierMsg && (
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">✓ {dossierMsg}</span>
                )}
              </div>
              <button
                onClick={saveDossier}
                disabled={savingDossier}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
              >
                {savingDossier ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                )}
                {dossier ? 'Mettre à jour le dossier' : 'Enregistrer en dossier'}
              </button>
            </div>
            {/* Stats */}
            <StatsCards
              avgPriceM2={avgPriceM2}
              avgPriceM2ICC={avgPriceM2ICC}
              count={selectedForStats.length}
              avgSurface={avgSurface}
              iccLatest={iccData?.latest}
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
              iccData={iccData}
            />

            {/* Tableau Desktop */}
            <TransactionTable
              transactions={selectedTransactions}
              sortConfig={sortConfig}
              onSort={handleSort}
              onDelete={deleteTransaction}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelection}
              notes={notes}
              onEditNote={editNote}
              iccData={iccData}
            />

            {/* Cartes Mobile */}
            <TransactionCards
              transactions={selectedTransactions}
              onDelete={deleteTransaction}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelection}
              iccData={iccData}
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
