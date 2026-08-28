'use client';

import { useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const fmt = (n) => Math.round(n).toLocaleString('fr-FR');

const useNewItem = () => {
  const ref = useRef(0);
  return () => ({ id: ++ref.current, label: '', pct: '' });
};

export default function EstimateurContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const newItem = useNewItem();
  const basePrice = parseFloat(searchParams.get('basePrice')) || 0;
  const isICC = searchParams.get('icc') === '1';

  const [surface, setSurface] = useState('');
  const [plusValues, setPlusValues] = useState([]);
  const [moinsValues, setMoinsValues] = useState([]);

  const surf = parseFloat(surface) || 0;
  const totalBrut = surf > 0 ? Math.round(basePrice * surf) : 0;
  const hasBase = basePrice > 0 && surf > 0;

  let running = totalBrut;

  const pvResults = plusValues.map((pv) => {
    const from = running;
    const pct = parseFloat(pv.pct) || 0;
    const factor = 1 + pct / 100;
    running = Math.round(from * factor);
    return { ...pv, pct, from, to: running, factor };
  });

  const mvResults = moinsValues.map((mv) => {
    const from = running;
    const pct = parseFloat(mv.pct) || 0;
    const factor = 1 - pct / 100;
    running = Math.round(from * factor);
    return { ...mv, pct, from, to: running, factor };
  });

  const totalFinal = hasBase ? running : 0;

  const updatePV = (id, field, value) =>
    setPlusValues((prev) => prev.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  const removePV = (id) => setPlusValues((prev) => prev.filter((x) => x.id !== id));
  const updateMV = (id, field, value) =>
    setMoinsValues((prev) => prev.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  const removeMV = (id) => setMoinsValues((prev) => prev.filter((x) => x.id !== id));

  return (
    <div className="bg-gray-50 dark:bg-slate-950 min-h-screen text-gray-800 dark:text-white font-sans px-4 md:px-8 py-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="relative flex justify-center items-center mb-2">
          <button
            onClick={() => router.back()}
            className="absolute left-0 text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            Retour
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Estimation</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Calculez le prix en appliquant des plus et moins-values</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {/* Base de calcul */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 border-l-4 border-l-blue-500">
            <h2 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4">Base de calcul</h2>
            {basePrice > 0 ? (
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold text-blue-700 dark:text-blue-400">{fmt(basePrice)} €/m²</span>
                {isICC && (
                  <span className="text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full font-semibold">act. ICC</span>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Aucun prix de base — revenez au tableau de bord et cliquez sur la carte "Prix Moyen / m²".</p>
            )}
            <div className="flex items-center gap-3">
              <label htmlFor="surface" className="text-sm font-semibold text-gray-600 dark:text-slate-400 shrink-0">Surface :</label>
              <input
                id="surface" type="number" min="0" value={surface}
                onChange={(e) => setSurface(e.target.value)} placeholder="Ex : 100"
                className="border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2 w-32 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-500 dark:text-slate-400">m²</span>
            </div>
            {hasBase && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Total brut</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{fmt(totalBrut)} €</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{fmt(basePrice)} × {surf} m²</p>
              </div>
            )}
          </div>

          {/* Plus-values */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-900/40 px-4 py-3">
              <h2 className="font-semibold text-green-800 dark:text-green-300 flex items-center gap-2 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7"/>
                </svg>
                Plus-values
              </h2>
              <button
                onClick={() => setPlusValues((p) => [...p, newItem()])}
                className="flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 bg-white dark:bg-green-900/30 border border-green-200 dark:border-green-800 px-3 py-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/50 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                </svg>
                Ajouter
              </button>
            </div>
            {pvResults.length === 0 && (
              <p className="px-4 py-4 text-sm text-gray-400 dark:text-slate-500 italic">Aucune plus-value — cliquez sur Ajouter.</p>
            )}
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {pvResults.map((pv) => (
                <div key={pv.id} className="flex items-center gap-3 px-4 py-3 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors">
                  <input
                    type="text" value={pv.label} onChange={(e) => updatePV(pv.id, 'label', e.target.value)}
                    placeholder="Libellé (ex: Piscine)"
                    className="flex-1 text-sm border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2 focus:ring-1 focus:ring-green-400 focus:border-transparent"
                  />
                  <input
                    type="number" value={pv.pct} onChange={(e) => updatePV(pv.id, 'pct', e.target.value)}
                    placeholder="%" min="0" max="200"
                    className="w-20 text-sm text-center border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-2 py-2 focus:ring-1 focus:ring-green-400 focus:border-transparent"
                  />
                  <span className="text-xs text-gray-400 dark:text-slate-500">%</span>
                  {pv.pct > 0 && hasBase && (
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                      +{fmt(pv.to - pv.from)} €
                    </span>
                  )}
                  <button onClick={() => removePV(pv.id)} className="text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Moins-values */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/40 px-4 py-3">
              <h2 className="font-semibold text-red-800 dark:text-red-300 flex items-center gap-2 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
                Moins-values
              </h2>
              <button
                onClick={() => setMoinsValues((m) => [...m, newItem()])}
                className="flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 bg-white dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/50 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                </svg>
                Ajouter
              </button>
            </div>
            {mvResults.length === 0 && (
              <p className="px-4 py-4 text-sm text-gray-400 dark:text-slate-500 italic">Aucune moins-value — cliquez sur Ajouter.</p>
            )}
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {mvResults.map((mv) => (
                <div key={mv.id} className="flex items-center gap-3 px-4 py-3 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors">
                  <input
                    type="text" value={mv.label} onChange={(e) => updateMV(mv.id, 'label', e.target.value)}
                    placeholder="Libellé (ex: Travaux)"
                    className="flex-1 text-sm border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2 focus:ring-1 focus:ring-red-400 focus:border-transparent"
                  />
                  <input
                    type="number" value={mv.pct} onChange={(e) => updateMV(mv.id, 'pct', e.target.value)}
                    placeholder="%" min="0" max="100"
                    className="w-20 text-sm text-center border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-2 py-2 focus:ring-1 focus:ring-red-400 focus:border-transparent"
                  />
                  <span className="text-xs text-gray-400 dark:text-slate-500">%</span>
                  {mv.pct > 0 && hasBase && (
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                      -{fmt(mv.from - mv.to)} €
                    </span>
                  )}
                  <button onClick={() => removeMV(mv.id)} className="text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Total final */}
          {totalFinal > 0 && (
            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1 uppercase tracking-wide">Estimation finale</p>
              <p className="text-4xl font-bold text-blue-800 dark:text-blue-200">{fmt(totalFinal)} €</p>
              {surf > 0 && (
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1 font-medium">
                  ≈ {fmt(Math.round(totalFinal / surf))} €/m²
                </p>
              )}
              {totalFinal !== totalBrut && (
                <p className="text-xs text-blue-500 dark:text-blue-400 mt-2 opacity-75">
                  Base : {fmt(totalBrut)} € → Ajusté : {totalFinal > totalBrut ? '+' : ''}{fmt(totalFinal - totalBrut)} €
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
