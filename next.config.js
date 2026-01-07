/** @type {import('next').NextConfig} */
const nextConfig = {
  // Nouvelle syntaxe officielle pour exclure bcryptjs du bundling
  serverExternalPackages: ['bcryptjs', 'pg'],
  
  // On retire la config webpack manuelle qui créait des conflits
};

module.exports = nextConfig;
