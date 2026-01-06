# Guide d'Installation des Index MySQL

Ce guide explique comment créer les index nécessaires pour optimiser les performances de votre application DVF.

## 📋 Prérequis

- Base de données MySQL ou MariaDB
- Accès administrateur à la base de données
- La table `transactions` doit exister avec les colonnes suivantes :
  - `geom` (type GEOMETRY ou POINT avec SRID 4326)
  - `code_postal` (VARCHAR)
  - `nom_commune` (VARCHAR)
  - `type_local` (VARCHAR)
  - `date_mutation` (DATE ou DATETIME)
  - `valeur_fonciere` (DECIMAL ou FLOAT)
  - `surface_terrain` (DECIMAL ou FLOAT)

## 🚀 Méthode 1 : Via l'API (Recommandé)

La méthode la plus simple est d'utiliser la route API dédiée :

### En développement

```bash
# Depuis votre navigateur ou avec curl
curl http://localhost:3000/api/create-indexes
```

### En production

Vous devez fournir un token d'autorisation :

1. Ajoutez dans votre `.env` :
```env
INDEX_CREATION_TOKEN=votre_token_secret_ici
```

2. Appelez l'API avec le token :
```bash
curl -H "Authorization: Bearer votre_token_secret_ici" \
  https://votre-domaine.com/api/create-indexes
```

## 🛠️ Méthode 2 : Via MySQL en ligne de commande

1. Connectez-vous à votre base de données :
```bash
mysql -u votre_user -p votre_database
```

2. Exécutez le fichier SQL :
```bash
mysql -u votre_user -p votre_database < mysql_indexes.sql
```

## 🛠️ Méthode 3 : Via un client MySQL (phpMyAdmin, MySQL Workbench, etc.)

1. Ouvrez votre client MySQL
2. Sélectionnez votre base de données
3. Ouvrez l'onglet "SQL" ou "Requête"
4. Copiez-collez le contenu du fichier `mysql_indexes.sql`
5. Exécutez les commandes

## 📊 Index créés

Les index suivants seront créés pour optimiser les performances :

### 1. Index Spatial (CRITIQUE)
- **`idx_transactions_geom_spatial`** : Index spatial sur `geom`
  - **Impact** : Accélère considérablement les recherches géographiques (ST_DWithin)
  - **Temps de création** : Peut prendre plusieurs minutes sur de grandes tables

### 2. Index Géographiques
- **`idx_transactions_code_postal`** : Index sur code postal
- **`idx_transactions_nom_commune`** : Index sur nom de commune
- **`idx_transactions_code_commune`** : Index composite (code_postal + nom_commune)
  - **Impact** : Accélère les recherches par localisation

### 3. Index de Filtrage
- **`idx_transactions_type_local`** : Index sur type de local
- **`idx_transactions_type_surface`** : Index composite (type_local + surface_terrain)
  - **Impact** : Accélère le filtrage par type (Maison, Appartement, etc.)

### 4. Index de Tri
- **`idx_transactions_date_mutation`** : Index sur date de mutation (DESC)
- **`idx_transactions_id_date`** : Index composite (id_mutation + date_mutation DESC)
  - **Impact** : Accélère le tri par date (ORDER BY date_mutation DESC)

### 5. Index de Prix
- **`idx_transactions_valeur_fonciere`** : Index sur valeur foncière
- **`idx_transactions_prix_date`** : Index composite (prix + date)
  - **Impact** : Accélère les filtres et tris par prix

### 6. Index pour Terrains
- **`idx_transactions_surface_terrain`** : Index sur surface terrain
- **`idx_transactions_terrain_null`** : Index composite (type_local + surface_terrain)
  - **Impact** : Accélère l'identification des terrains nus

### 7. Index Composite Optimisé
- **`idx_transactions_composite`** : Index composite (type_local + date + prix)
  - **Impact** : Optimise les requêtes complexes combinant plusieurs filtres

## ⏱️ Temps d'exécution

Le temps de création des index dépend de la taille de votre table :

- **< 100 000 lignes** : 1-5 minutes
- **100 000 - 1 000 000 lignes** : 5-15 minutes
- **> 1 000 000 lignes** : 15-60 minutes

⚠️ **Important** : La création des index peut bloquer temporairement les écritures sur la table. Planifiez cette opération pendant une période de faible activité.

## ✅ Vérification

Pour vérifier que les index ont été créés :

```sql
SHOW INDEX FROM transactions;
```

Ou pour plus de détails :

```sql
SELECT 
  INDEX_NAME,
  COLUMN_NAME,
  SEQ_IN_INDEX,
  INDEX_TYPE,
  NON_UNIQUE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'transactions'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;
```

## 📈 Amélioration des performances attendue

Après la création des index, vous devriez observer :

- **Recherches géographiques** : 80-95% plus rapides
- **Filtrage par type** : 70-90% plus rapide
- **Tri par date** : 60-80% plus rapide
- **Requêtes combinées** : 50-70% plus rapides

## 🔧 Maintenance

### Analyser les statistiques

Après la création des index, MySQL met automatiquement à jour les statistiques. Si nécessaire, vous pouvez forcer une mise à jour :

```sql
ANALYZE TABLE transactions;
```

### Optimiser la table

Pour défragmenter la table et reconstruire les index (à faire périodiquement) :

```sql
OPTIMIZE TABLE transactions;
```

⚠️ **Note** : `OPTIMIZE TABLE` verrouille la table pendant l'opération. Planifiez cette opération pendant une période de faible activité.

## 🐛 Dépannage

### Erreur : "Duplicate key name"

Cela signifie que l'index existe déjà. C'est normal, vous pouvez ignorer cette erreur.

### Erreur : "The used table type doesn't support SPATIAL indexes"

Votre table doit utiliser le moteur InnoDB ou MyISAM. Vérifiez avec :

```sql
SHOW TABLE STATUS WHERE Name = 'transactions';
```

Si nécessaire, convertissez la table :

```sql
ALTER TABLE transactions ENGINE=InnoDB;
```

### Erreur : "Column 'geom' cannot be part of SPATIAL index"

La colonne `geom` doit être de type GEOMETRY, POINT, ou similaire. Vérifiez avec :

```sql
DESCRIBE transactions;
```

Si nécessaire, modifiez la colonne :

```sql
ALTER TABLE transactions MODIFY geom GEOMETRY NOT NULL SRID 4326;
```

### Les performances ne s'améliorent pas

1. Vérifiez que les index sont bien créés (voir section "Vérification")
2. Exécutez `ANALYZE TABLE transactions;` pour mettre à jour les statistiques
3. Utilisez `EXPLAIN` pour voir si MySQL utilise les index :

```sql
EXPLAIN SELECT ... FROM transactions WHERE ST_DWithin(...);
```

4. Vérifiez que la colonne `geom` a bien un SRID 4326

## 📝 Notes importantes

1. **Espace disque** : Les index prennent de l'espace disque supplémentaire (généralement 10-30% de la taille de la table)

2. **Performances d'écriture** : Les index ralentissent légèrement les INSERT/UPDATE/DELETE car ils doivent être mis à jour. C'est un compromis acceptable pour les gains en lecture.

3. **Index spatial** : L'index spatial (`idx_transactions_geom_spatial`) est le plus important et peut prendre le plus de temps à créer. Ne l'interrompez pas.

4. **Production** : En production, créez les index pendant une fenêtre de maintenance pour éviter d'impacter les utilisateurs.

## 🔗 Ressources

- [Documentation MySQL - CREATE INDEX](https://dev.mysql.com/doc/refman/8.0/en/create-index.html)
- [Documentation MySQL - SPATIAL INDEX](https://dev.mysql.com/doc/refman/8.0/en/creating-spatial-indexes.html)
- [Documentation MySQL - ANALYZE TABLE](https://dev.mysql.com/doc/refman/8.0/en/analyze-table.html)

