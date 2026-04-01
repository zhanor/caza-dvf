import { NextResponse } from 'next/server';

const GPU_WFS = 'https://data.geopf.fr/wfs/ows';
const DELTA = 0.001; // ~100m bounding box autour du point

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat'));
  const lng = parseFloat(searchParams.get('lng'));

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Paramètres lat/lng invalides' }, { status: 400 });
  }

  const bbox = `${lng - DELTA},${lat - DELTA},${lng + DELTA},${lat + DELTA},EPSG:4326`;

  const params = new URLSearchParams({
    SERVICE: 'WFS',
    VERSION: '2.0.0',
    REQUEST: 'GetFeature',
    TYPENAMES: 'wfs_du:zone_urba',
    outputFormat: 'application/json',
    PROPERTYNAME: 'libelle,libelong,typezone,urlfic',
    bbox,
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
    const typezone = props.typezone || null;
    const urlReglementPdf = props.urlfic || null;

    return NextResponse.json({ zone, typezone, urlReglementPdf });
  } catch {
    return NextResponse.json({ error: 'Erreur réseau' }, { status: 500 });
  }
}
