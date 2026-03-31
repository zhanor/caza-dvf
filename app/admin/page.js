'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

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
      if (res.status === 403) {
        setError('Accès réservé aux administrateurs');
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) setInvitations(data);
    } catch (err) {
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const createInvitation = async (e) => {
    e.preventDefault();
    setCreating(true);
    setNewLink('');
    setEmailSent(false);
    setEmailError('');
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
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const deleteInvitation = async (id) => {
    if (!confirm('Supprimer ?')) return;
    await fetch(`/api/invitations?id=${id}`, { method: 'DELETE' });
    fetchInvitations();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(newLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full"></div></div>;
  }

  if (!session) {
    return <div className="min-h-screen flex items-center justify-center"><Link href="/login" className="text-blue-600">Se connecter</Link></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-8 text-center max-w-md">
          <h1 className="text-xl font-bold text-red-600 mb-4">⛔ {error}</h1>
          <Link href="/" className="text-blue-600 hover:underline">Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">🔑 Gestion des Invitations</h1>
          <Link href="/" className="text-blue-600">← Retour</Link>
        </div>

        {/* Formulaire */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-6 mb-8">
          <h2 className="font-semibold text-lg mb-4 text-slate-800 dark:text-white">Nouvelle Invitation</h2>
          <form onSubmit={createInvitation} className="grid md:grid-cols-3 gap-4">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email (optionnel)"
              className="px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
            <select
              value={expiresHours}
              onChange={(e) => setExpiresHours(Number(e.target.value))}
              className="px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            >
              <option value={24}>24h</option>
              <option value={48}>48h</option>
              <option value={72}>72h</option>
              <option value={168}>1 semaine</option>
            </select>
            <button type="submit" disabled={creating} className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-50">
              {creating ? '...' : 'Générer'}
            </button>
          </form>

          {newLink && (
            <div className="mt-4 space-y-3">
              {emailSent && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  <span className="text-green-700 dark:text-green-400 text-sm font-medium">Email d'invitation envoyé avec succès.</span>
                </div>
              )}
              {emailError && (
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg text-sm text-orange-700 dark:text-orange-400">
                  <span className="font-medium">Email non envoyé :</span> {emailError}
                </div>
              )}
              <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Lien d'invitation :</p>
                <div className="flex gap-2">
                  <input type="text" value={newLink} readOnly className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-mono text-slate-600 dark:text-slate-300" />
                  <button onClick={copyLink} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors">{copied ? '✓ Copié' : 'Copier'}</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Liste */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow overflow-hidden">
          <h2 className="font-semibold text-lg p-6 border-b dark:border-slate-800 text-slate-800 dark:text-white">Invitations</h2>
          {loading ? <p className="p-6 text-gray-500">Chargement...</p> : invitations.length === 0 ? <p className="p-6 text-gray-500">Aucune</p> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Expire</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.id} className="border-t dark:border-slate-800">
                    <td className="px-4 py-3 dark:text-white">{inv.email || 'Tout email'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{new Date(inv.expires_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3">
                      {inv.used_at ? <span className="text-green-600">Utilisé</span> : new Date(inv.expires_at) < new Date() ? <span className="text-red-600">Expiré</span> : <span className="text-blue-600">Actif</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!inv.used_at && <button onClick={() => deleteInvitation(inv.id)} className="text-red-600 hover:underline">Supprimer</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
