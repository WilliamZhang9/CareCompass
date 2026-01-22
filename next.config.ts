import type { NextConfig } from "next";
import { baseURL } from "./baseUrl";

const nextConfig: NextConfig = {
  assetPrefix: baseURL,
  devIndicators: false,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
