/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclure ces packages du bundling côté serveur
  serverExternalPackages: ['bcryptjs', 'pg'],
  
  // Configuration Turbopack pour Next.js 16
  turbopack: {},
};

module.exports = nextConfig;
