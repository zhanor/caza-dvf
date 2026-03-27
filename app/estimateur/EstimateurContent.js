'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const fmt = (n) => Math.round(n).toLocaleString('fr-FR');

let _id = 0;
const newItem = () => ({ id: ++_id, label: '', pct: '' });

export default function EstimateurContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const basePrice = parseFloat(searchParams.get('basePrice')) || 0;
  const isICC = searchParams.get('icc') === '1';

  const [surface, setSurface] = useState('');
  const [plusValues, setPlusValues] = useState([]);
  const [moinsValues, setMoinsValues] = useState([]);

  const surf = parseFloat(surface) || 0;
  const totalBrut = surf > 0 ? Math.round(basePrice * surf) : 0;
  const hasBase = basePrice > 0 && surf > 0;

  // ── Calcul en cascade ──────────────────────────────────────────────────
  // Plus-values d'abord, puis moins-values, chaque % appliqué sur le sous-total précédent
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

  // ── Helpers mutation ────────────────────────────────────────────────────
  const updatePV = (id, field, value) =>
    setPlusValues((prev) => prev.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  const removePV = (id) => setPlusValues((prev) => prev.filter((x) => x.id !== id));

  const updateMV = (id, field, value) =>
    setMoinsValues((prev) => prev.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  const removeMV = (id) => setMoinsValues((prev) => prev.filter((x) => x.id !== id));

  // ── Rendu ──────────────────────────────────────────────────────────────
  return (
    <div className="bg-gray-50 dark:bg-slate-950 min-h-screen text-gray-800 dark:text-white font-sans px-4 md:px-8 py-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1 text-sm font-medium transition-colors"
          >
            ← Retour
          </button>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Estimateur immobilier
          </h1>
        </div>

        {/* ── Base de calcul ─── */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 border-l-4 border-l-blue-500 mb-6">
          <h2 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4">
            Base de calcul
          </h2>

          {basePrice > 0 ? (
            <div className="flex items-baseline gap-2 mb-5">
              <span className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                {fmt(basePrice)} €/m²
              </span>
              {isICC && (
                <span className="text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full font-semibold">
                  act. ICC
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-red-500 mb-4">
              Aucun prix de base. Revenez au tableau de bord et cliquez sur la carte "Prix Moyen / m²".
            </p>
          )}

          <div className="flex items-center gap-3">
            <label
              htmlFor="surface"
              className="text-sm font-semibold text-gray-600 dark:text-slate-400 shrink-0"
            >
              Surface :
            </label>
            <input
              id="surface"
              type="number"
              min="0"
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
              placeholder="Ex : 100"
              className="border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2 w-32 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm text-gray-500 dark:text-slate-400">m²</span>
          </div>

          {hasBase && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex items-baseline gap-3">
              <div>
                <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide">
                  Total brut
                </p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {fmt(totalBrut)} €
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                  {fmt(basePrice)} × {surf} m²
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Plus-values ─── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 mb-4 overflow-hidden">
          <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-900/40 px-4 py-3">
            <h2 className="font-semibold text-green-800 dark:text-green-300 flex items-center gap-2 text-sm">
              <span>▲</span> Plus-values
            </h2>
            <button
              onClick={() => setPlusValues((prev) => [...prev, newItem()])}
              className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors"
            >
              + Ajouter
            </button>
          </div>

          <div className="p-4 space-y-3">
            {pvResults.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-slate-500 italic text-center py-3">
                Aucune plus-value — cliquez sur Ajouter
              </p>
            )}
            {pvResults.map((pv) => (
              <div
                key={pv.id}
                className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-100 dark:border-green-900/40"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pv.label}
                    onChange={(e) => updatePV(pv.id, 'label', e.target.value)}
                    placeholder="Ex : Vue mer"
                    className="border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded px-2 py-1.5 text-sm flex-1 focus:ring-1 focus:ring-green-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    min="0"
                    max="200"
                    value={pv.pct === '' ? '' : pv.pct}
                    onChange={(e) => updatePV(pv.id, 'pct', e.target.value)}
                    placeholder="0"
                    className="border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded px-2 py-1.5 text-sm w-16 text-center focus:ring-1 focus:ring-green-500 focus:border-transparent"
                  />
                  <span className="text-sm text-gray-500 dark:text-slate-400 shrink-0">%</span>
                  <button
                    onClick={() => removePV(pv.id)}
                    className="text-red-400 hover:text-red-600 font-bold text-xl leading-none px-1 transition-colors"
                    aria-label="Supprimer"
                  >
                    ×
                  </button>
                </div>
                {hasBase && (
                  <p className="text-xs text-green-700 dark:text-green-400 mt-2 font-mono">
                    {fmt(pv.from)} × {pv.factor.toFixed(2)} ={' '}
                    <strong className="text-green-800 dark:text-green-300">
                      {fmt(pv.to)} €
                    </strong>
                    {pv.pct > 0 && (
                      <span className="text-green-600 dark:text-green-500 ml-2">
                        (+{fmt(pv.to - pv.from)} €)
                      </span>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Moins-values ─── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 mb-6 overflow-hidden">
          <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/40 px-4 py-3">
            <h2 className="font-semibold text-red-800 dark:text-red-300 flex items-center gap-2 text-sm">
              <span>▼</span> Moins-values
            </h2>
            <button
              onClick={() => setMoinsValues((prev) => [...prev, newItem()])}
              className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors"
            >
              + Ajouter
            </button>
          </div>

          <div className="p-4 space-y-3">
            {mvResults.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-slate-500 italic text-center py-3">
                Aucune moins-value — cliquez sur Ajouter
              </p>
            )}
            {mvResults.map((mv) => (
              <div
                key={mv.id}
                className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-100 dark:border-red-900/40"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={mv.label}
                    onChange={(e) => updateMV(mv.id, 'label', e.target.value)}
                    placeholder="Ex : Vétusté"
                    className="border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded px-2 py-1.5 text-sm flex-1 focus:ring-1 focus:ring-red-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={mv.pct === '' ? '' : mv.pct}
                    onChange={(e) => updateMV(mv.id, 'pct', e.target.value)}
                    placeholder="0"
                    className="border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded px-2 py-1.5 text-sm w-16 text-center focus:ring-1 focus:ring-red-500 focus:border-transparent"
                  />
                  <span className="text-sm text-gray-500 dark:text-slate-400 shrink-0">%</span>
                  <button
                    onClick={() => removeMV(mv.id)}
                    className="text-red-400 hover:text-red-600 font-bold text-xl leading-none px-1 transition-colors"
                    aria-label="Supprimer"
                  >
                    ×
                  </button>
                </div>
                {hasBase && (
                  <p className="text-xs text-red-700 dark:text-red-400 mt-2 font-mono">
                    {fmt(mv.from)} × {mv.factor.toFixed(2)} ={' '}
                    <strong className="text-red-800 dark:text-red-300">
                      {fmt(mv.to)} €
                    </strong>
                    {mv.pct > 0 && (
                      <span className="text-red-600 dark:text-red-500 ml-2">
                        (-{fmt(mv.from - mv.to)} €)
                      </span>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Total Final ─── */}
        {hasBase && (
          <div className="bg-slate-800 dark:bg-slate-700 text-white p-6 rounded-xl shadow-lg text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Estimation totale
            </p>
            <p className="text-5xl font-bold mb-2 tracking-tight">
              {fmt(totalFinal)} €
            </p>
            <p className="text-slate-300 text-lg">
              soit{' '}
              <span className="font-bold text-white">
                {fmt(Math.round(totalFinal / surf))} €/m²
              </span>
            </p>
            {(plusValues.length > 0 || moinsValues.length > 0) && (
              <p className="text-xs text-slate-500 mt-3">
                Base brute : {fmt(totalBrut)} €
                {totalFinal !== totalBrut && (
                  <>
                    {' '}·{' '}
                    <span className={totalFinal >= totalBrut ? 'text-green-400' : 'text-red-400'}>
                      {totalFinal >= totalBrut ? '+' : ''}
                      {fmt(totalFinal - totalBrut)} €
                    </span>
                  </>
                )}
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
