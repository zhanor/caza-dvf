/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclure ces packages du bundling côté serveur
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs', 'pg'],
  },
};

module.exports = nextConfig;
