/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  trailingSlash: true, // This adds a trailing slash to all routes

  webpack: (config) => {
    config.module.rules.push({
      test: /\.test\.js$/,
      use: 'ignore-loader',
    });
    return config;
  },

  // Static export configuration
  distDir: 'out', // Define the output directory
};

module.exports = nextConfig;
