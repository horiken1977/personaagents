/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // TypeScriptのビルドエラーを無視（本番環境でのみ）
    ignoreBuildErrors: false,
  },
  eslint: {
    // ESLintエラーでビルドを停止しない
    ignoreDuringBuilds: false,
  },
  // 静的ファイルの処理
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;