/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. On empêche Next.js de compiler ces librairies (Server Components)
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs', 'pg'],
  },
  // 2. On force Webpack à les ignorer totalement (Méthode radicale)
  webpack: (config) => {
    config.externals = [...(config.externals || []), 'bcryptjs', 'pg'];
    return config;
  },
};

module.exports = nextConfig;
