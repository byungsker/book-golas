import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(process.cwd(), "../.."),
  },
  transpilePackages: ["@bookgolas/supabase", "@bookgolas/ui"],
};

export default nextConfig;
