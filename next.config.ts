import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['pg', 'bcryptjs', 'nodemailer', 'exceljs'],
  // Lets you open the dev server from your local network address (e.g. a phone on the same Wi-Fi).
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*'],
  async redirects() {
    return [
      { source: '/clients', destination: '/companies', permanent: true },
      { source: '/clients/:path*', destination: '/companies/:path*', permanent: true },
    ]
  },
}

export default nextConfig
