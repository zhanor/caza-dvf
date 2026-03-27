import { Suspense } from 'react';
import EstimateurContent from './EstimateurContent';

export const metadata = {
  title: 'Estimateur — CaZa DVF',
};

export default function EstimateurPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-gray-50 min-h-screen flex items-center justify-center text-gray-400 text-sm">
          Chargement…
        </div>
      }
    >
      <EstimateurContent />
    </Suspense>
  );
}
