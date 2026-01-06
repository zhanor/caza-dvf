# Configuration de la Base de Données PostgreSQL

## Fichier .env.local

Créez un fichier `.env.local` à la racine du projet avec le contenu suivant :

```env
# Option 1 : URL de connexion complète (recommandé)
DATABASE_URL="postgresql://user:password@host:port/database"

# Option 2 : Variables séparées
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_NAME=postgres
DB_PORT=5432
DB_SSL=false
```

⚠️ **Important** : Remplacez `user`, `password`, `host`, `port`, et `database` par vos propres identifiants.

## Utilisation

La route API `/api/search` est maintenant disponible et utilise votre base de données PostgreSQL/PostGIS.

### Exemple d'appel :

```
GET /api/search?lat=48.8566&lng=2.3522
```

Cette route recherche les transactions dans un rayon de 500 mètres autour du point spécifié.

