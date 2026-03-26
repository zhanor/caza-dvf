'use client';

export default function Error({ reset }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Une erreur est survenue</h2>
        <button
          onClick={() => reset()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
