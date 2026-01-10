/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclure ces packages du bundling côté serveur
  serverExternalPackages: ['bcryptjs', 'pg'],
  
  // Transpiler bcryptjs pour éviter les erreurs ESM/CommonJS
  transpilePackages: ['bcryptjs'],
  
  // Configuration webpack pour gérer bcryptjs
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'bcryptjs': 'commonjs bcryptjs',
      });
    }
    return config;
  },
};

module.exports = nextConfig;
