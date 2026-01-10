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
  const [copied, setCopied] = useState(false);

  // Charger les invitations
  useEffect(() => {
    if (status === 'authenticated') {
      fetchInvitations();
    }
  }, [status]);

  const fetchInvitations = async () => {
    try {
      const res = await fetch('/api/invitations');
      const data = await res.json();
      setInvitations(data);
    } catch (err) {
      console.error('Erreur chargement invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  const createInvitation = async (e) => {
    e.preventDefault();
    setCreating(true);
    setNewLink('');

    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: newEmail || null, 
          expiresInHours: expiresHours 
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        setNewLink(data.invitation.link);
        setNewEmail('');
        fetchInvitations();
      }
    } catch (err) {
      console.error('Erreur création invitation:', err);
    } finally {
      setCreating(false);
    }
  };

  const deleteInvitation = async (id) => {
    if (!confirm('Supprimer cette invitation ?')) return;

    try {
      await fetch(`/api/invitations?id=${id}`, { method: 'DELETE' });
      fetchInvitations();
    } catch (err) {
      console.error('Erreur suppression:', err);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-600 dark:text-slate-400 mb-4">Vous devez être connecté</p>
          <Link href="/login" className="text-blue-600 hover:underline">Se connecter</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
              Gestion des Invitations
            </h1>
            <p className="text-gray-600 dark:text-slate-400 text-sm mt-1">
              Créez des liens d'inscription temporaires
            </p>
          </div>
          <Link 
            href="/" 
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
          >
            ← Retour
          </Link>
        </div>

        {/* Formulaire de création */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
            Nouvelle Invitation
          </h2>
          
          <form onSubmit={createInvitation} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Email du destinataire (optionnel)
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="exemple@email.com"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si renseigné, seul cet email pourra s'inscrire
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Expire dans
                </label>
                <select
                  value={expiresHours}
                  onChange={(e) => setExpiresHours(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                >
                  <option value={24}>24 heures</option>
                  <option value={48}>48 heures</option>
                  <option value={72}>72 heures</option>
                  <option value={168}>1 semaine</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-all"
            >
              {creating ? 'Création...' : 'Générer le lien'}
            </button>
          </form>

          {/* Affichage du nouveau lien */}
          {newLink && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm font-medium text-green-800 dark:text-green-400 mb-2">
                Lien créé avec succès !
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newLink}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded font-mono"
                />
                <button
                  onClick={() => copyToClipboard(newLink)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-all"
                >
                  {copied ? '✓ Copié' : 'Copier'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Liste des invitations */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              Invitations existantes
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Chargement...</div>
          ) : invitations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Aucune invitation</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-600 dark:text-slate-400">Email</th>
                    <th className="px-4 py-3 text-left text-gray-600 dark:text-slate-400">Créé le</th>
                    <th className="px-4 py-3 text-left text-gray-600 dark:text-slate-400">Expire le</th>
                    <th className="px-4 py-3 text-left text-gray-600 dark:text-slate-400">Statut</th>
                    <th className="px-4 py-3 text-right text-gray-600 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                  {invitations.map((inv) => {
                    const isExpired = new Date(inv.expires_at) < new Date();
                    const isUsed = !!inv.used_at;
                    
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-gray-900 dark:text-white">
                          {inv.email || <span className="text-gray-400">Tout email</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-400">
                          {new Date(inv.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-400">
                          {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-3">
                          {isUsed ? (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                              Utilisé
                            </span>
                          ) : isExpired ? (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
                              Expiré
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                              Actif
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!isUsed && (
                            <button
                              onClick={() => deleteInvitation(inv.id)}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Supprimer
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
