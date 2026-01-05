# Configuration de la Base de Données PostgreSQL

## Fichier .env.local

Créez un fichier `.env.local` à la racine du projet avec le contenu suivant :

```
DATABASE_URL="postgresql://postgres:Maison2026!@51.178.36.210:5432/postgres"
```

## Utilisation

La route API `/api/search` est maintenant disponible et utilise votre base de données PostgreSQL/PostGIS.

### Exemple d'appel :

```
GET /api/search?lat=48.8566&lng=2.3522
```

Cette route recherche les transactions dans un rayon de 500 mètres autour du point spécifié.

