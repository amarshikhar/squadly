/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // postgres.js tries to import cloudflare:sockets for Workers support;
      // tell webpack to treat it as an external so it doesn't choke locally.
      config.externals.push('cloudflare:sockets');
    }
    return config;
  },
};

export default nextConfig;
