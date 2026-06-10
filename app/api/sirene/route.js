import { NextResponse } from 'next/server';
import { rateLimiter, getClientIp } from '@/lib/security';

// Mapping codes NAF → libellé activité simplifié
// Gère NAF2008 (4711A, 7311Y) et NAF2003 (52.4R, 55.1A)
function nafToActivite(nafCode) {
  if (!nafCode) return null;
  const digits = nafCode.replace(/\./g, '').replace(/[A-Za-z]/g, '');
  const num4 = parseInt(digits.substring(0, 4).padEnd(4, '0'), 10);
  const num2 = parseInt(digits.substring(0, 2), 10);

  // Entrepôt : logistique, transport, entreposage
  if (num4 >= 4910 && num4 <= 5329) return 'Entrepôt';
  if (num2 >= 60 && num2 <= 63) return 'Entrepôt';

  // Commerce : détail, gros, auto, restauration, hôtellerie
  if (num4 >= 4511 && num4 <= 4799) return 'Commerce';
  if (num4 >= 5510 && num4 <= 5630) return 'Commerce';
  if (num2 >= 50 && num2 <= 52) return 'Commerce';
  if (num2 === 55) return 'Commerce';

  // Tout le reste = Bureaux / Autres
  return 'Bureaux / Autres';
}

export async function GET(request) {
  // Limite haute : l'enrichissement SIRENE appelle cette route en rafale (1 par local)
  const rl = rateLimiter.check(`sirene:${getClientIp(request)}`, 300, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ activite: null });
  }

  const { searchParams } = new URL(request.url);
  const num = searchParams.get('num') || '';
  const voie = searchParams.get('voie') || '';
  const cp = searchParams.get('cp') || '';

  if (!voie || !cp) return NextResponse.json({ activite: null });

  try {
    // SIRENE V3.11 : espace implicite = AND, pas de mot-clé AND explicite
    const parts = [];
    if (num) parts.push(`numeroVoieEtablissement:${num}`);
    // Prendre seulement le premier mot de la voie pour éviter les erreurs de syntaxe
    const voiePremierMot = voie.split(' ').find(w => w.length > 3) || voie.split(' ')[0];
    parts.push(`libelleVoieEtablissement:${voiePremierMot}`);
    parts.push(`codePostalEtablissement:${cp}`);

    const query = parts.join(' ');
    const url = `https://api.insee.fr/api-sirene/3.11/siret?q=${encodeURIComponent(query)}&nombre=1`;

    const res = await fetch(url, {
      headers: {
        'X-INSEE-Api-Key-Integration': process.env.SIRENE_API_KEY,
        'Accept': 'application/json',
      },
    });

    if (res.status === 404) return NextResponse.json({ activite: null });
    if (!res.ok) throw new Error(`SIRENE ${res.status}`);

    const data = await res.json();
    const etab = data.etablissements?.[0];
    if (!etab) return NextResponse.json({ activite: null });

    const naf = etab.activitePrincipaleEtablissement
      || etab.activitePrincipaleNAF25Etablissement
      || etab.uniteLegale?.activitePrincipaleUniteLegale;
    const activite = nafToActivite(naf);

    return NextResponse.json({ activite, naf: naf || null });

  } catch (err) {
    console.error('[SIRENE]', err.message);
    return NextResponse.json({ activite: null });
  }
}
