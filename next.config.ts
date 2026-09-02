import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.2.156"],
  output: "standalone",
  images: { unoptimized: true },
};

export default nextConfig;
