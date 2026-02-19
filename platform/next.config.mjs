/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: "http://165.232.183.6/v1/:path*", // Proxy to Remote Backend (Port 80)
      },
    ];
  },
};

export default nextConfig;
