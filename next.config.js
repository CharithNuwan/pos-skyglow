/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '.vercel.app',
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
      ].filter(Boolean),
    },
  },
  images: {
    remotePatterns: [
      { hostname: 'localhost' },
      { hostname: '**.vercel.app' },
    ],
  },
}

module.exports = nextConfig
