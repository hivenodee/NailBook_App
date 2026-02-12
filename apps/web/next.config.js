/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@nailbook/db", "@nailbook/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
    ],
  },
};

module.exports = nextConfig;
