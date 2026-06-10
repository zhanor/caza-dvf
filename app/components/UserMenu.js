'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

function getInitials(nameOrEmail) {
  if (!nameOrEmail) return '?';
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nameOrEmail[0].toUpperCase();
}

export default function UserMenu() {
  const { data: session } = useSession();

  return (
    <div className="flex items-center gap-3">
      {session?.user && (
        <div className="hidden sm:flex flex-col items-end mr-1">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300 leading-tight">
            {session.user.name || session.user.email}
          </span>
          <span className="text-xs text-gray-400 dark:text-slate-500">{session.user.email}</span>
        </div>
      )}

      {session?.user && (
        <div className="relative shrink-0">
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm select-none">
            {getInitials(session.user.name || session.user.email)}
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white dark:border-slate-900 rounded-full" title="Connecté"></span>
        </div>
      )}

      {!session?.user && (
        <Link
          href="/login"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
          title="Se connecter"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="hidden sm:inline">Se connecter</span>
        </Link>
      )}

      {session?.user && (
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title="Déconnexion"
          aria-label="Se déconnecter"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Déconnexion</span>
        </button>
      )}
    </div>
  );
}
