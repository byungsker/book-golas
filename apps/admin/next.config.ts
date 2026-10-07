import type { NextConfig } from "next";
import path from "node:path";

const repositoryRoot = path.resolve(process.cwd(), "../..");
const aiMonitorFiles = [
  "./ai-monitor/src/core.mjs",
  "./ai-monitor/fixtures/events.json",
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: repositoryRoot,
  outputFileTracingIncludes: {
    "/ai-monitor": aiMonitorFiles,
    "/ai-monitor/logs": aiMonitorFiles,
    "/ai-monitor/reports": aiMonitorFiles,
    "/api/admin/ai-monitor": aiMonitorFiles,
  },
  turbopack: {
    root: repositoryRoot,
  },
  transpilePackages: ["@bookgolas/supabase", "@bookgolas/ui"],
};

export default nextConfig;
