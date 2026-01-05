import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Disable devtools to avoid RSC bundler bug
  devIndicators: false,
  // Supabase image domains for photo storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.pixabay.com',
        pathname: '/photo/**',
      },
    ],
  },
  // Experimental features for Next.js 15
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // For photo uploads
    },
  },
}

export default nextConfig
