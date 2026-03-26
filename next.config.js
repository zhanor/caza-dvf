/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclure ces packages du bundling côté serveur
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs', 'pg'],
  },

  // Transpiler les packages ESM
  transpilePackages: ['@react-pdf/renderer'],

  // Headers de sécurité HTTP
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Content Security Policy (CSP)
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-inline requis pour Next.js et React
              "style-src 'self' 'unsafe-inline'", // unsafe-inline requis pour Tailwind et styled-components
              "img-src 'self' data: https: blob:", // data: pour base64, https: pour images externes
              "font-src 'self' data:",
              "connect-src 'self' https://api-adresse.data.gouv.fr", // API géocodage
              "frame-ancestors 'none'", // Équivalent X-Frame-Options: DENY
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests"
            ].join('; ')
          },
          // Protection contre le clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          // Empêcher le MIME sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // Politique de référent
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Permissions (désactiver fonctionnalités non utilisées)
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          // Strict Transport Security (HTTPS uniquement)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          // Protection XSS (obsolète mais garde compatibilité)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          // DNS Prefetch Control
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          }
        ]
      },
      // Cache pour fichiers statiques
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  },

  // Optimisation images (préparation Phase 2)
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 an
  },

  // Compression
  compress: true,

  // Retirer le header X-Powered-By
  poweredByHeader: false,
};

module.exports = nextConfig;
