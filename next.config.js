/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  assetPrefix: process.env.NODE_ENV === 'production' ? '/loop-eventos-proto' : '',
  basePath: process.env.NODE_ENV === 'production' ? '/loop-eventos-proto' : '',
};

module.exports = nextConfig;
