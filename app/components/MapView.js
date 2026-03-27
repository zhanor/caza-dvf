'use client';

import dynamic from 'next/dynamic';

const MapViewLeaflet = dynamic(() => import('./MapViewLeaflet'), {
  ssr: false,
  loading: () => (
    <div className="h-[360px] bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-gray-500 dark:text-slate-400 text-sm">
      Chargement de la carte...
    </div>
  ),
});

export default function MapView(props) {
  return (
    <div className="mb-6 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-slate-800">
      <MapViewLeaflet {...props} />
    </div>
  );
}
