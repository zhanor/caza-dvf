const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: '.env.local' }); // Chargement des variables d'environnement
const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Import de la route de recherche PostgreSQL
const searchTransactions = require('./app/api/search/route');

// Générateur de données de secours (Pour que la démo marche toujours)
function generateMockData(lat, lon) {
    const transactions = [];
    const baseLat = parseFloat(lat);
    const baseLon = parseFloat(lon);
    
    for (let i = 0; i < 15; i++) {
        // Décalage aléatoire léger pour simuler le voisinage (~200m)
        const mockLat = baseLat + (Math.random() - 0.5) * 0.004;
        const mockLon = baseLon + (Math.random() - 0.5) * 0.004;
        
        const surface = Math.floor(Math.random() * 80) + 20; // 20 à 100m2
        const pricePerM2 = 4000 + Math.floor(Math.random() * 3000); // 4000 à 7000 €/m2
        const type = Math.random() > 0.7 ? "Maison" : "Appartement";
        
        transactions.push({
            type: "Feature",
            properties: {
                date_mutation: `2023-${String(Math.floor(Math.random()*12)+1).padStart(2, '0')}-${String(Math.floor(Math.random()*28)+1).padStart(2, '0')}`,
                type_local: type,
                nature_mutation: "Vente",
                valeur_fonciere: surface * pricePerM2,
                surface_reelle_bati: surface,
                surface_terrain: type === "Maison" ? surface * 4 : 0,
                numero_voie: Math.floor(Math.random() * 100),
                type_voie: "Rue",
                voie: "de la Démo (Simulé)",
                code_postal: "00000",
                commune: "Mode Démo",
                id_parcelle: "DEMO" + i
            },
            geometry: {
                type: "Point",
                coordinates: [mockLon, mockLat]
            }
        });
    }
    return { type: "FeatureCollection", features: transactions, _source: "simulation_fallback" };
}

app.get('/api/dvf', async (req, res) => {
    const { lat, lon, dist } = req.query;

    if (!lat || !lon) return res.status(400).json({ error: "Lat/Lon requis" });

    // PRIORITÉ 1 : Essayer PostgreSQL d'abord
    try {
        console.log("🗄️ [PostgreSQL] Tentative de connexion à la base de données...");
        await searchTransactions(req, res);
        // Si searchTransactions réussit, elle envoie la réponse et on retourne
        // Si elle échoue, elle lève une exception et on continue avec le fallback
        if (res.headersSent) {
            return; // La réponse a été envoyée, on s'arrête ici
        }
    } catch (error) {
        // Si PostgreSQL échoue, continuer avec le fallback API externe
        console.warn("⚠️ [PostgreSQL] Échec, passage au fallback API externe:", error.message);
        if (res.headersSent) {
            return; // Ne rien faire si la réponse a déjà été envoyée
        }
        // Sinon, continuer avec le fallback ci-dessous
    }

    // URLs Officielles
    const cquestUrl = `https://api.cquest.org/dvf?lat=${lat}&lon=${lon}&dist=${dist || 500}`;
    const etalabUrl = `https://app.dvf.etalab.gouv.fr/api/mutations3/geoloc?lat=${lat}&lon=${lon}&dist=${dist || 500}`;

    // Headers "Fake Browser" pour Cquest
    const browserHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site'
    };

    // Headers spécifiques pour Etalab (se faire passer pour leur site)
    const etalabHeaders = {
        ...browserHeaders,
        'Origin': 'https://app.dvf.etalab.gouv.fr',
        'Referer': 'https://app.dvf.etalab.gouv.fr/',
        'Host': 'app.dvf.etalab.gouv.fr'
    };

    const fetchWithTimeout = async (url, options = {}) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 3000); // 3s max
        try {
            const res = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(id);
            return res;
        } catch (e) {
            clearTimeout(id);
            throw e;
        }
    };

    try {
        // 1. Essai Cquest avec headers navigateur
        console.log("🕵️ [Proxy] Tentative Cquest...");
        const r1 = await fetchWithTimeout(cquestUrl, { headers: browserHeaders });
        if (r1.ok) {
            const d1 = await r1.json();
            console.log("✅ Succès Cquest");
            return res.json(d1);
        }
        console.warn(`⚠️ Échec Cquest: ${r1.status}`);
    } catch (e) { 
        console.warn(`⚠️ Erreur réseau Cquest: ${e.message}`); 
    }

    try {
        // 2. Essai Etalab avec headers de camouflage
        console.log("🕵️ [Proxy] Tentative Etalab (Mode Camouflage)...");
        const r2 = await fetchWithTimeout(etalabUrl, { headers: etalabHeaders });
        if (r2.ok) {
            const d2 = await r2.json();
            console.log("✅ Succès Etalab");
            return res.json(d2);
        }
        console.error(`❌ Échec Etalab: ${r2.status}`);
    } catch (e) { 
        console.error(`❌ Erreur réseau Etalab: ${e.message}`); 
    }

    // 3. FAILOVER : On renvoie les fausses données pour sauver la mise
    console.warn("⚠️ APIs bloquées : Envoi données simulées");
    const mockData = generateMockData(lat, lon);
    return res.json(mockData);
});

// Route de recherche PostgreSQL (prioritaire si disponible)
app.get('/api/search', searchTransactions);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur Demo-Proof démarré sur ${PORT}`);
});

module.exports = app;
