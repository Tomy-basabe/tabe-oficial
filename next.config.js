/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'tabe.software' }],
        destination: 'https://tabe.com.ar/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.tabe.software' }],
        destination: 'https://tabe.com.ar/:path*',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
