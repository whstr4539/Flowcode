import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'dist/web',
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
  // 禁用React严格模式以避免双重渲染问题
  reactStrictMode: false,
  // 压缩和优化
  compress: true,
  // 生产环境优化
  productionBrowserSourceMaps: false,
  // 实验性功能优化
  experimental: {
    // 优化包体积
    optimizePackageImports: [
      'lucide-react',
      'reactflow',
      '@radix-ui/react-icons',
      'recharts',
    ],
  },
  // 自定义HTTP头（静态导出时无效，但保留配置供参考）
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
