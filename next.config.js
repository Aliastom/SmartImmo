/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configuration pour jsPDF
  webpack: (config, { isServer, dev }) => {
    // Configuration pour le client uniquement
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
        crypto: false,
        zlib: false,
        http: false,
        https: false,
        util: false,
        url: false,
        buffer: false,
        process: false,
      };
    }

    // Ignorer les avertissements de source map en développement
    if (dev) {
      config.ignoreWarnings = [
        { module: /node_modules\/jspdf/ },
        { file: /node_modules\/jspdf\/dist\/jspdf.es.min.js/ },
      ];
    }

    return config;
  },
  // Configuration pour les images distantes
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'ndvsnildxwrzasrpqdie.supabase.co',
      },
    ],
  },
  // Configuration expérimentale
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Optimisation pour les fichiers statiques
    optimizeCss: true,
  },
  // Packages externes pour les composants serveur
  serverExternalPackages: ['jspdf', 'jspdf-autotable'],
}

module.exports = nextConfig
