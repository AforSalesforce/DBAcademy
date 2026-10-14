import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // One address for search engines: send the production *.vercel.app alias
  // to the custom domain. (Preview deployments have other hostnames.)
  redirects: async () => [
    {
      source: '/:path*',
      has: [{ type: 'host', value: 'dba-cademy.vercel.app' }],
      destination: 'https://www.dbacademy.online/:path*',
      permanent: true,
    },
  ],
  compress: true,
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
