/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclure ces packages du bundling côté serveur
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs', 'pg'],
  },
  
  // Transpiler les packages ESM
  transpilePackages: ['@react-pdf/renderer'],
};

module.exports = nextConfig;
