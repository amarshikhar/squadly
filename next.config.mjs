/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
    serverComponentsExternalPackages: ['postgres'],
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
    // postgres package includes a Cloudflare polyfill that references cloudflare:sockets
    // This is not needed in Next.js and breaks middleware compilation
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'cloudflare:sockets': false,
    };
    return config;
  },
};

export default nextConfig;
