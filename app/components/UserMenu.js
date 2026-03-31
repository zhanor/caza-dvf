'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

/**
 * Composant menu utilisateur (connexion/déconnexion)
 */
export default function UserMenu() {
  const { data: session } = useSession();

  return (
    <div className="flex items-center gap-3">
      {/* Informations utilisateur */}
      {session?.user && (
        <div className="hidden sm:flex flex-col items-end mr-2">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
            {session.user.name || session.user.email}
          </span>
          <span className="text-xs text-gray-500 dark:text-slate-500">{session.user.email}</span>
        </div>
      )}

      {/* Bouton Se connecter (si non connecté) */}
      {!session?.user && (
        <Link
          href="/login"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 rounded-lg transition-colors"
          title="Se connecter"
        >
          <span className="hidden sm:inline">Se connecter</span>
          <svg
            className="w-5 h-5 sm:hidden"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span className="sr-only sm:hidden">Se connecter</span>
        </Link>
      )}

      {/* Bouton déconnexion */}
      {session?.user && (
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title="Déconnexion"
          aria-label="Se déconnecter"
        >
          <span className="hidden sm:inline">Déconnexion</span>
          <svg
            className="w-5 h-5 sm:hidden"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span className="sr-only sm:hidden">Déconnexion</span>
        </button>
      )}
    </div>
  );
}
