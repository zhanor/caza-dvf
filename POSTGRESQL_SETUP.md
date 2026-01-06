# Configuration PostgreSQL - Guide de Démarrage

## ✅ Configuration Appliquée

Votre application est maintenant configurée pour utiliser PostgreSQL.

⚠️ **Important** : Configurez vos identifiants dans le fichier `.env.local` (voir ci-dessous).

## 📁 Fichiers Modifiés

### 1. `.env.local` (créé)
Contient vos identifiants de connexion PostgreSQL.

⚠️ **Important** : Ce fichier est ignoré par Git (dans `.gitignore`) pour des raisons de sécurité.

### 2. `lib/db.js` (amélioré)
- Support de `DATABASE_URL` ou variables séparées
- Gestion d'erreurs améliorée
- Test de connexion automatique en développement
- Validation des paramètres requis

### 3. `.env.example` (mis à jour)
Template pour les autres développeurs (sans mot de passe réel).

## 🚀 Démarrage

1. **Vérifiez que PostgreSQL est démarré** :
   ```bash
   # Sur Windows (si installé en service)
   # PostgreSQL devrait démarrer automatiquement
   
   # Vérifier avec psql
   psql -U postgres -d postgres
   ```

2. **Vérifiez que PostGIS est installé** :
   ```sql
   -- Connectez-vous à PostgreSQL
   psql -U postgres -d postgres
   
   -- Vérifiez l'extension PostGIS
   SELECT PostGIS_version();
   
   -- Si elle n'existe pas, créez-la :
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

3. **Démarrez l'application** :
   ```bash
   npm run dev
   ```

4. **Vérifiez la connexion** :
   - Regardez les logs de la console
   - Vous devriez voir : `✅ Connexion PostgreSQL établie avec succès`
   - Si vous voyez une erreur, vérifiez les sections ci-dessous

## 🔧 Dépannage

### Erreur : "Configuration de base de données manquante"

**Cause** : Les variables d'environnement ne sont pas chargées.

**Solution** :
1. Vérifiez que le fichier `.env.local` existe à la racine du projet
2. Redémarrez le serveur Next.js (`npm run dev`)
3. Next.js charge automatiquement `.env.local` au démarrage

### Erreur : "Connection refused" ou "ECONNREFUSED"

**Cause** : PostgreSQL n'est pas démarré ou écoute sur un autre port.

**Solution** :
1. Vérifiez que le service PostgreSQL est démarré :
   ```powershell
   # Windows
   Get-Service -Name postgresql*
   ```
2. Vérifiez le port dans `postgresql.conf` ou utilisez :
   ```bash
   psql -U postgres -h localhost -p 5432
   ```

### Erreur : "password authentication failed"

**Cause** : Le mot de passe est incorrect.

**Solution** :
1. Vérifiez le mot de passe dans `.env.local`
2. Testez la connexion manuellement :
   ```bash
   psql -U postgres -d postgres
   # Entrez votre mot de passe
   ```

### Erreur : "database does not exist"

**Cause** : La base de données `postgres` n'existe pas.

**Solution** :
```sql
-- Créez la base de données
CREATE DATABASE postgres;

-- Ou utilisez une autre base existante et modifiez DB_NAME dans .env.local
```

### Erreur : "extension postgis does not exist"

**Cause** : L'extension PostGIS n'est pas installée.

**Solution** :
```sql
-- Installez PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

## 📝 Utilisation de DATABASE_URL (Alternative)

Si vous préférez utiliser une URL de connexion complète au lieu de variables séparées, vous pouvez utiliser :

```env
# Dans .env.local
DATABASE_URL=postgresql://user:password@localhost:5432/database
```

⚠️ **Note** : Si votre mot de passe contient des caractères spéciaux (comme `!`, `@`, `#`, etc.), vous devez les encoder en URL si vous utilisez `DATABASE_URL`. 
- `!` devient `%21`
- `@` devient `%40`
- `#` devient `%23`
- etc.

Exemple : Si votre mot de passe est `MonMotDePasse!`, utilisez :
```env
DATABASE_URL=postgresql://user:MonMotDePasse%21@localhost:5432/database
```

Cependant, avec les variables séparées (comme configuré actuellement), vous n'avez pas besoin d'encoder le mot de passe.

## 🔒 Sécurité

- ✅ `.env.local` est dans `.gitignore` (ne sera pas commité)
- ✅ `.env.example` ne contient pas de mots de passe réels
- ⚠️ Ne partagez jamais votre fichier `.env.local` publiquement

## 📚 Ressources

- [Documentation node-postgres](https://node-postgres.com/)
- [Documentation PostGIS](https://postgis.net/documentation/)
- [Documentation Next.js - Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

