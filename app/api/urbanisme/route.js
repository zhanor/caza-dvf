import { NextResponse } from 'next/server';

const GPU_WFS = 'https://data.geopf.fr/wfs/ows';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat'));
  const lng = parseFloat(searchParams.get('lng'));

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Paramètres lat/lng invalides' }, { status: 400 });
  }

  const params = new URLSearchParams({
    SERVICE: 'WFS',
    VERSION: '2.0.0',
    REQUEST: 'GetFeature',
    TYPENAMES: 'gpu:zone_urba',
    outputFormat: 'application/json',
    CQL_FILTER: `INTERSECTS(the_geom,POINT(${lng} ${lat}))`,
    count: '1',
  });

  try {
    const res = await fetch(`${GPU_WFS}?${params}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Erreur GPU API' }, { status: 502 });
    }

    const data = await res.json();
    const feature = data.features?.[0];

    if (!feature) {
      return NextResponse.json({ zone: null, urlReglementPdf: null });
    }

    const props = feature.properties;
    const zone = props.libelong || props.libelle || props.typezone || null;
    const urlReglementPdf = props.urlfic || null;

    return NextResponse.json({ zone, urlReglementPdf });
  } catch {
    return NextResponse.json({ error: 'Erreur réseau' }, { status: 500 });
  }
}
