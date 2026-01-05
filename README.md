# Outil d'Évaluation Immobilière & Recherche Cadastrale

Application web pour l'évaluation immobilière basée sur les données DVF (Demande de Valeurs Foncières) avec recherche cadastrale.

## 🚀 Installation

### Prérequis
- Node.js (version 14 ou supérieure)
- npm (généralement inclus avec Node.js)

### Étapes d'installation

1. **Installer les dépendances** :
```bash
npm install express cors node-fetch
```

Ou simplement :
```bash
npm install
```

## 🏃 Lancement en local

### Démarrer le serveur

```bash
node server.js
```

Le serveur démarrera sur `http://localhost:3000`

### Accéder à l'application

Ouvrez votre navigateur et allez sur : `http://localhost:3000`

## 📁 Structure du projet

```
.
├── public/
│   ├── index.html      # Interface utilisateur
│   ├── styles.css      # Styles CSS
│   └── script.js       # Logique frontend
├── server.js           # Serveur Express (backend)
├── package.json        # Dépendances Node.js
└── README.md          # Documentation
```

## 🌐 Déploiement

Cette application peut être déployée sur :
- **Render** : Connectez votre repo Git et configurez le build command `npm install` et start command `node server.js`
- **Vercel** : Déployez en tant qu'application Node.js
- **Railway** : Connectez votre repo et Railway détectera automatiquement Node.js
- **Heroku** : Utilisez le buildpack Node.js

### Variables d'environnement

Le port est configuré automatiquement via `process.env.PORT` (défaut: 3000).

## 🔧 Fonctionnalités

- ✅ Recherche d'adresse avec autocomplétion (API Adresse)
- ✅ Identification de parcelle cadastrale (API IGN)
- ✅ Récupération des transactions DVF réelles
- ✅ Filtrage par type de bien (Maison, Appartement, Terrain, Local Commercial)
- ✅ Filtrage par rayon de distance
- ✅ Gestion des outliers (suppression/restauration)
- ✅ Calcul du prix moyen au m²
- ✅ Export PDF des rapports

## 📝 Notes techniques

- Le backend sert de proxy pour contourner les problèmes CORS avec l'API DVF
- Les données sont récupérées depuis `https://api.cquest.org/dvf`
- En cas d'erreur de l'API, l'application bascule automatiquement sur des données simulées


