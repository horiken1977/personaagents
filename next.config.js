/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // 既存のHTMLファイルへのアクセスを保持
      {
        source: '/chat.html',
        destination: '/chat',
      },
      // 静的ファイルのアクセスを保持
      {
        source: '/personas.json',
        destination: '/api/personas',
      }
    ];
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
  // 既存のファイルとの互換性を保つ
  trailingSlash: false,
};

module.exports = nextConfig;