/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.postimg.cc',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Production optimizations
  // experimental: {
  //   optimizeCss: true,
  // },
  // Skip problematic API routes during build
  generateBuildId: async () => {
    return 'namtech-build'
  },
  // Webpack configuration to handle pdf-parse issues
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push({
        'pdf-parse': 'commonjs pdf-parse'
      })
    }
    return config
  },
  // Enable static exports if needed
  // output: 'export',
  // trailingSlash: true,
}

export default nextConfig
