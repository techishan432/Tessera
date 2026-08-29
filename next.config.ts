import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the Turbopack workspace root to this project. Without this, Turbopack
  // walks up and trips over a stray (empty) ~/package-lock.json in the home
  // dir, which it then warns about / ignores.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
