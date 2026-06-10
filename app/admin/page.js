'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

function InvitationBadge({ inv }) {
  const now = new Date();
  const expired = new Date(inv.expires_at) < now;
  if (inv.used_at) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Utilisé</span>;
  if (expired) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">Expiré</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">Actif</span>;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [expiresHours, setExpiresHours] = useState(48);
  const [newLink, setNewLink] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'authenticated') fetchInvitations();
  }, [status]);

  const fetchInvitations = async () => {
    try {
      const res = await fetch('/api/invitations');
      if (res.status === 403) { setError('Accès réservé aux administrateurs'); setLoading(false); return; }
      const data = await res.json();
      if (Array.isArray(data)) setInvitations(data);
    } catch { setError('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const createInvitation = async (e) => {
    e.preventDefault();
    setCreating(true);
    setNewLink(''); setEmailSent(false); setEmailError('');
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail || null, expiresInHours: expiresHours }),
      });
      const data = await res.json();
      if (data.success) {
        setNewLink(data.invitation.link);
        setEmailSent(data.emailSent || false);
        setEmailError(data.emailError || '');
        setNewEmail('');
        fetchInvitations();
      }
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  };

  const deleteInvitation = async (id) => {
    if (!confirm('Supprimer cette invitation ?')) return;
    await fetch(`/api/invitations?id=${id}`, { method: 'DELETE' });
    fetchInvitations();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(newLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950"><div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full"></div></div>;
  }

  if (!session) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950"><Link href="/login" className="text-blue-600 hover:underline">Se connecter</Link></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-8 text-center max-w-md border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <h1 className="text-xl font-bold text-red-600 mb-2">{error}</h1>
          <Link href="/" className="text-blue-600 hover:underline text-sm">Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 px-4 py-8">
      <div className="max-w-4xl mx-auto">

        {/* Header gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 mb-6 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight">Administration</h1>
                <p className="text-blue-100 text-sm">Gestion des invitations</p>
              </div>
            </div>
            <Link href="/" className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
              Retour
            </Link>
          </div>
        </div>

        {/* Formulaire création */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 mb-6">
          <h2 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            Nouvelle invitation
          </h2>
          <form onSubmit={createInvitation} className="grid md:grid-cols-3 gap-4">
            <input
              type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email (optionnel)"
              className="px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={expiresHours} onChange={(e) => setExpiresHours(Number(e.target.value))}
              className="px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={24}>Expire dans 24h</option>
              <option value={48}>Expire dans 48h</option>
              <option value={72}>Expire dans 72h</option>
              <option value={168}>Expire dans 1 semaine</option>
            </select>
            <button type="submit" disabled={creating}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 font-semibold text-sm disabled:opacity-50 transition-colors"
            >
              {creating ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Génération...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                  Générer
                </>
              )}
            </button>
          </form>

          {newLink && (
            <div className="mt-4 space-y-3">
              {emailSent && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  Email d'invitation envoyé avec succès.
                </div>
              )}
              {emailError && (
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg text-sm text-orange-700 dark:text-orange-400">
                  <span className="font-medium">Email non envoyé :</span> {emailError}
                </div>
              )}
              <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Lien d'invitation</p>
                <div className="flex gap-2 items-center">
                  <input
                    type="text" readOnly value={newLink}
                    className="flex-1 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded px-3 py-2 text-gray-700 dark:text-slate-300 font-mono truncate"
                  />
                  <button
                    onClick={copyLink}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                      copied ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {copied ? (
                      <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Copié !</>
                    ) : (
                      <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg> Copier</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Liste des invitations */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              Invitations récentes
            </h2>
            <span className="text-xs text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-full">{invitations.length}</span>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center"><div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full"></div></div>
          ) : invitations.length === 0 ? (
            <div className="p-8 text-center text-gray-400 dark:text-slate-500 text-sm">Aucune invitation créée.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Créé le</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Expire le</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {invitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3"><InvitationBadge inv={inv} /></td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-300">{inv.email || <span className="text-gray-400 dark:text-slate-500 italic">—</span>}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-xs font-mono">{new Date(inv.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-xs font-mono">{new Date(inv.expires_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => deleteInvitation(inv.id)}
                          className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Supprimer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
