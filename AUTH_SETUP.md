# Configuration de l'authentification NextAuth.js

## ✅ Installation terminée

L'authentification complète avec NextAuth.js a été implémentée. Voici ce qui a été créé :

### 📦 Dépendances installées
- `next-auth@beta` (v5)
- `bcryptjs` + `@types/bcryptjs`

### 📁 Fichiers créés

1. **API d'inscription** : `app/api/auth/register/route.js`
   - Route POST pour créer un nouveau compte
   - Validation email/mot de passe
   - Hachage sécurisé avec bcryptjs

2. **Configuration NextAuth** : `app/api/auth/[...nextauth]/route.js`
   - Provider Credentials configuré
   - Callbacks pour la session (ID, nom, email)
   - Page de connexion personnalisée

3. **Pages Frontend** :
   - `app/login/page.js` - Page de connexion
   - `app/register/page.js` - Page d'inscription
   - Design dark mode avec Tailwind CSS

4. **Protection des routes** : `middleware.js`
   - Protection automatique de toutes les routes
   - Routes publiques : `/login`, `/register`, `/api/auth/*`
   - Redirection vers `/login` si non connecté

5. **Composants** :
   - `app/components/Providers.js` - SessionProvider wrapper
   - Bouton de déconnexion dans `app/page.js`

## 🔧 Configuration requise

### 1. Variable d'environnement NEXTAUTH_SECRET

Ajoutez dans votre fichier `.env.local` :

```env
NEXTAUTH_SECRET=votre-secret-tres-long-et-aleatoire-ici
```

**⚠️ Important** : Générez un secret sécurisé. Vous pouvez utiliser :

```bash
# Sur Linux/Mac
openssl rand -base64 32

# Ou en ligne de commande Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. Base de données

Assurez-vous que la table `users` existe. Si ce n'est pas le cas, exécutez :

```bash
node scripts/create_users_table.js
```

## 🚀 Utilisation

### Inscription
1. Accédez à `/register`
2. Remplissez le formulaire (nom optionnel, email, mot de passe)
3. Vous serez redirigé vers `/login` avec un message de succès

### Connexion
1. Accédez à `/login` (ou redirection automatique si non connecté)
2. Entrez votre email et mot de passe
3. Vous serez connecté et redirigé vers la page d'accueil

### Déconnexion
- Cliquez sur le bouton "Déconnexion" dans la barre de navigation (en haut à droite)

## 🔒 Sécurité

- ✅ Mots de passe hachés avec bcryptjs (10 rounds)
- ✅ Validation email et mot de passe
- ✅ Protection CSRF intégrée (NextAuth)
- ✅ Sessions JWT sécurisées
- ✅ Middleware de protection des routes

## 📝 Structure de la table users

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 🎨 Design

- Design moderne et clean
- Support Dark Mode complet
- Responsive (mobile et desktop)
- Transitions douces avec Tailwind CSS
- Messages d'erreur et de succès clairs

## ⚠️ Notes importantes

1. **NEXTAUTH_SECRET** : Changez le secret par défaut en production !
2. **HTTPS** : Utilisez HTTPS en production pour la sécurité des sessions
3. **Base de données** : Assurez-vous que la connexion PostgreSQL fonctionne

## 🐛 Dépannage

### Erreur : "NEXTAUTH_SECRET is not set"
- Ajoutez `NEXTAUTH_SECRET` dans `.env.local`

### Erreur : "Table users does not exist"
- Exécutez : `node scripts/create_users_table.js`

### Redirection infinie
- Vérifiez que le middleware exclut bien `/login` et `/register`
- Vérifiez que `NEXTAUTH_SECRET` est défini

