import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Empty turbopack object satisfies Next.js 16 build check when custom webpack functions exist
  turbopack: {},
  webpack: (config) => {
    // Map '@/raw-engine' to 'platform/raw-engine' inside the platform root
    config.resolve.alias["@/raw-engine"] = path.resolve(__dirname, "./raw-engine");
    return config;
  },
};

export default nextConfig;