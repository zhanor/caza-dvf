/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclure ces packages du bundling côté serveur
  serverExternalPackages: ['bcrypt', 'pg'],
  
  // Configuration Turbopack pour Next.js 16
  turbopack: {},
};

module.exports = nextConfig;
