/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclure ces packages du bundling côté serveur
  serverExternalPackages: ['bcryptjs', 'pg'],
  
  // Configuration Turbopack (Next.js 16+)
  turbopack: {},
};

module.exports = nextConfig;
