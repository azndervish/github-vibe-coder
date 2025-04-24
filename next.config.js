/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.BASE_PATH || '',
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  webpack: (config) => {
    config.module.rules.push({
      test: /\.test\.js$/,
      use: 'ignore-loader',
    });
    return config;
  },
};

module.exports = nextConfig;
