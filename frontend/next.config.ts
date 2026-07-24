import type { NextConfig } from 'next'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:4000'

const nextConfig: NextConfig = {
    reactStrictMode: true,
    experimental: {
        optimizePackageImports: ['lenis'],
    },
    async rewrites() {
        return [
            {
                source: '/api/admin/:path*',
                destination: `${BACKEND}/api/admin/:path*`,
            },
            {
                source: '/api/users/:path*',
                destination: `${BACKEND}/api/users/:path*`,
            },
            {
                source: '/api/chat/:path*',
                destination: `${BACKEND}/api/chat/:path*`,
            },
            {
                source: '/api/topics/:path*',
                destination: `${BACKEND}/api/topics/:path*`,
            },
            {
                source: '/api/topics',
                destination: `${BACKEND}/api/topics`,
            },
            {
                source: '/api/payments/:path*',
                destination: `${BACKEND}/api/payments/:path*`,
            },
            {
                source: '/api/order/:path*',
                destination: `${BACKEND}/api/order/:path*`,
            },
            {
                source: '/api/plans',
                destination: `${BACKEND}/api/plans`,
            },
            {
                source: '/api/plans/:path*',
                destination: `${BACKEND}/api/plans/:path*`,
            },
        ]
    },
}

export default nextConfig
