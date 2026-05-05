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
  // Consolidate /passes and /goals into the unified /services Browse page.
  // Pre-selects the right tab so the user lands on what they clicked, but the
  // tabs let them switch to All / Services / Passes / Goals from there.
  async redirects() {
    return [
      { source: '/passes', destination: '/services?kind=passes', permanent: false },
      { source: '/goals', destination: '/services?kind=goals', permanent: false },
    ];
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
