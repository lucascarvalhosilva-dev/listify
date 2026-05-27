import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.guiamos-marketplace.com.br" }],
        destination: "https://guiamos-marketplace.com.br/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
