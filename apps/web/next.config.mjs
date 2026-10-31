const API = process.env.API_URL || 'http://localhost:4010';

/** @type {import('next').NextConfig} */
export default {
  output: 'standalone',
  allowedDevOrigins: [
    '192.168.3.56',
    '192.168.3.56:3010',
    '*.trycloudflare.com',
  ],
  // Проксі на NestJS, щоб не мати проблем з CORS
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API}/api/:path*` }];
  },
};
