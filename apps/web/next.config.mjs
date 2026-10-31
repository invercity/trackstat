/** @type {import('next').NextConfig} */
export default {
  output: 'standalone',
  allowedDevOrigins: [
    '192.168.3.56',
    '192.168.3.56:3010',
    '*.trycloudflare.com',
  ],
};
