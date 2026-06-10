'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function DossiersPage() {
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDossiers = async () => {
    try {
      const res = await fetch('/api/dossiers');
      if (!res.ok) throw new Error('Erreur de chargement');
      const data = await res.json();
      if (Array.isArray(data)) setDossiers(data);
    } catch {
      setError('Impossible de charger les dossiers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDossiers(); }, []);

  const deleteDossier = async (id, nom) => {
    if (!confirm(`Supprimer le dossier « ${nom} » ?`)) return;
    await fetch(`/api/dossiers/${id}`, { method: 'DELETE' });
    fetchDossiers();
  };

  const toggleStatut = async (d) => {
    await fetch(`/api/dossiers/${d.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: d.statut === 'termine' ? 'en_cours' : 'termine' }),
    });
    fetchDossiers();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 px-4 py-8">
      <div className="max-w-4xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m-3 0h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Dossiers d'expertise</h1>
              <p className="text-xs text-gray-500 dark:text-slate-400">Recherches de comparables sauvegardées</p>
            </div>
          </div>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            Retour à la recherche
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3 mb-6" role="alert">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
          {loading ? (
            <div className="p-10 flex justify-center"><div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full"></div></div>
          ) : dossiers.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-gray-500 dark:text-slate-400 text-sm mb-2">Aucun dossier enregistré.</p>
              <p className="text-gray-400 dark:text-slate-500 text-xs">
                Lancez une recherche puis cliquez sur « Enregistrer en dossier » pour sauvegarder votre sélection de comparables.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {dossiers.map((d) => (
                <li key={d.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <Link href={`/?dossier=${d.id}`} className="flex-1 min-w-0 group">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">{d.nom}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
                        d.statut === 'termine'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      }`}>
                        {d.statut === 'termine' ? 'Terminé' : 'En cours'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mt-1 truncate">
                      {d.adresse_bien || 'Sans adresse'} · rayon {d.radius >= 1000 ? `${d.radius / 1000} km` : `${d.radius} m`}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                      {d.nb_retenus} retenu{d.nb_retenus > 1 ? 's' : ''} / {d.nb_total} comparable{d.nb_total > 1 ? 's' : ''} · modifié le {formatDate(d.updated_at)}
                    </div>
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleStatut(d)}
                      className="text-gray-400 hover:text-green-600 dark:hover:text-green-400 p-2 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                      title={d.statut === 'termine' ? 'Repasser en cours' : 'Marquer terminé'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </button>
                    <button
                      onClick={() => deleteDossier(d.id, d.nom)}
                      className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Supprimer le dossier"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
