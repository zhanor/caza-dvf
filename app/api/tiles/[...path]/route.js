// Proxy de tuiles OSM — sert les tuiles depuis notre domaine
// → élimine les problèmes CORS pour la capture html2canvas du PDF
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const parts = params.path; // ['z', 'x', 'y.png']
  if (!parts || parts.length !== 3) {
    return new Response('Not Found', { status: 404 });
  }

  const [z, x, yExt] = parts;
  const y = yExt.replace(/\.png$/i, '');

  // Validation stricte pour éviter toute injection SSRF
  if (!/^\d{1,2}$/.test(z) || !/^\d+$/.test(x) || !/^\d+$/.test(y)) {
    return new Response('Bad Request', { status: 400 });
  }

  const tileUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

  try {
    const res = await fetch(tileUrl, {
      headers: {
        'User-Agent': 'CaZaDVF/1.0 (cazadvf.fr)',
        'Referer': 'https://cazadvf.fr/',
      },
      next: { revalidate: 86400 }, // cache Next.js 24h
    });

    if (!res.ok) {
      return new Response('Tile Not Found', { status: 404 });
    }

    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response('Error', { status: 500 });
  }
}
