import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // outputFileTracingRoot: path.resolve(__dirname, '../../'),  // Uncomment and add 'import path from "path"' if needed
  /* config options here */
  allowedDevOrigins: ['*.dev.coze.site'],
  serverExternalPackages: ['sharp'],
  // 确保 Vercel serverless 打包进 sharp 的 linux 原生库（否则 /api/img 会 DLOPEN 失败）
  outputFileTracingIncludes: {
    '/api/img': [
      './node_modules/sharp/**/*',
      './node_modules/@img/**/*',
    ],
  },
  experimental: {
    proxyClientMaxBodySize: '20mb',
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
