import { resolve } from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const repositoryRoot = resolve(process.cwd(), "..");
const aiMonitorFiles = [
  "./ai-monitor/src/core.mjs",
  "./ai-monitor/fixtures/events.json",
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: repositoryRoot,
  outputFileTracingIncludes: {
    "/admin/ai-monitor": aiMonitorFiles,
    "/admin/ai-monitor/reports": aiMonitorFiles,
    "/admin/ai-monitor/logs": aiMonitorFiles,
    "/api/admin/ai-monitor": aiMonitorFiles,
  },
  turbopack: {
    root: repositoryRoot,
  },
};

export default withNextIntl(nextConfig);
