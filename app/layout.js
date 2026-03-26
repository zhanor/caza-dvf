import './globals.css';
import Footer from './components/Footer';
import Providers from './components/Providers';

export const metadata = {
  metadataBase: new URL('https://cazadvf.fr'),
  title: {
    default: 'CaZa DVF - Outil d\'Évaluation Immobilière & Données DVF',
    template: '%s | CaZa DVF',
  },
  description:
    'Analysez les transactions immobilières en France avec les données officielles DVF. Recherche cadastrale, évaluation précise, prix au m², données géolocalisées. Outil professionnel pour agents immobiliers, notaires et particuliers.',
  keywords: [
    'DVF',
    'données valeurs foncières',
    'immobilier',
    'évaluation immobilière',
    'cadastre',
    'France',
    'transactions immobilières',
    'prix au m²',
    'notaire',
    'agent immobilier',
    'recherche cadastrale',
    'géolocalisation',
  ],
  authors: [{ name: 'Zatecka Michael' }],
  creator: 'Zatecka Michael',
  publisher: 'CaZa DVF',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://cazadvf.fr',
    title: 'CaZa DVF - Évaluation Immobilière & Données DVF Officielles',
    description:
      'Analysez les transactions immobilières en France avec les données officielles DVF. Recherche par adresse, géolocalisation, prix au m², données cadastrales.',
    siteName: 'CaZa DVF',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CaZa DVF - Outil d\'Évaluation Immobilière avec Données DVF',
      },
    ],
  },
  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: 'CaZa DVF - Évaluation Immobilière',
    description: 'Analysez les transactions immobilières en France avec les données DVF officielles',
    images: ['/og-image.png'],
    creator: '@zateckam',
  },
  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Manifest PWA
  manifest: '/manifest.json',
  themeColor: '#ffffff',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CaZa DVF',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icon.png', sizes: '512x512', type: 'image/png' }],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    viewportFit: 'cover',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'CaZa DVF',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'CaZa DVF',
  url: 'https://cazadvf.fr',
  description:
    'Outil d\'évaluation immobilière utilisant les données officielles DVF (Demandes de Valeurs Foncières). Recherche cadastrale, prix au m², géolocalisation.',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
  },
  author: {
    '@type': 'Person',
    name: 'Zatecka Michael',
  },
  inLanguage: 'fr-FR',
  keywords: 'DVF, immobilier, cadastre, évaluation immobilière, prix au m², France',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-gray-50 dark:bg-slate-950 min-h-screen flex flex-col">
        <Providers>
          <main className="flex-1 pb-8">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

