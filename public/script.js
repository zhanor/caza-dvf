let currentTransactions = []; // Stocke toutes les données reçues
let searchCenter = { lat: 0, lon: 0 }; // Stocke le centre de la recherche
let debounceTimer; // Pour l'autocomplétion

// --- GESTION DE L'AUTOCOMPLÉTION ---
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('addressInput');
    const suggestionsList = document.getElementById('suggestions');

    // Écouteur de frappe
    input.addEventListener('input', (e) => {
        const query = e.target.value;
        clearTimeout(debounceTimer);
        
        if (query.length < 3) {
            suggestionsList.classList.add('hidden');
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
                const data = await res.json();
                
                suggestionsList.innerHTML = '';
                if (data.features.length > 0) {
                    suggestionsList.classList.remove('hidden');
                    data.features.forEach(feature => {
                        const li = document.createElement('li');
                        li.className = "px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700 border-b last:border-0";
                        li.textContent = feature.properties.label;
                        li.onclick = () => {
                            // Au clic : on remplit l'input et on garde les coords
                            input.value = feature.properties.label;
                            searchCenter = {
                                lon: feature.geometry.coordinates[0],
                                lat: feature.geometry.coordinates[1]
                            };
                            suggestionsList.classList.add('hidden');
                            console.log("📍 Coordonnées sélectionnées via autocomplétion :", searchCenter);
                        };
                        suggestionsList.appendChild(li);
                    });
                } else {
                    suggestionsList.classList.add('hidden');
                }
            } catch (err) {
                console.error("Erreur autocomplétion:", err);
            }
        }, 300); // Délai de 300ms
    });

    // Cacher la liste si on clique ailleurs
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !suggestionsList.contains(e.target)) {
            suggestionsList.classList.add('hidden');
        }
    });
});

// --- FONCTION PRINCIPALE DE RECHERCHE ---
async function searchAddress() {
    const address = document.getElementById('addressInput').value;
    if (!address) return alert("Veuillez entrer une adresse");

    showLoading(true);

    try {
        // Si searchCenter est vide (pas passé par l'autocomplétion), on géocode à la main
        if (searchCenter.lat === 0 && searchCenter.lon === 0) {
            const geoRes = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`);
            const geoData = await geoRes.json();
            if (!geoData.features || geoData.features.length === 0) throw new Error("Adresse introuvable");
            const coords = geoData.features[0].geometry.coordinates;
            searchCenter = { lon: coords[0], lat: coords[1] };
        }
        
        console.log("🚀 Lancement recherche pour :", searchCenter);

        // Appel API backend
        const response = await fetch(`/api/search?lat=${searchCenter.lat}&lng=${searchCenter.lon}`);
        const data = await response.json();

        if (data.error) throw new Error(data.error);

        // Transformation des données
        currentTransactions = data.map(t => ({
            id: t.id_mutation || Math.random().toString(36),
            date: new Date(t.date_mutation).toLocaleDateString('fr-FR'),
            type: t.type_local,
            address: `${t.adresse_numero || ''} ${t.adresse_nom_voie || ''}, ${t.nom_commune || ''}`,
            surface: t.surface_reelle_bati || 0,
            price: t.valeur_fonciere || 0,
            lat: t.latitude,
            lon: t.