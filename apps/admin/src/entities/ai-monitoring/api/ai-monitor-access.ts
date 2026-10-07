function normalizeHost(host: string | null | undefined): string {
  const normalized = host?.trim().toLowerCase() ?? "";
  if (normalized.startsWith("[")) {
    const closingBracket = normalized.indexOf("]");
    if (closingBracket > 0) return normalized.slice(1, closingBracket);
  }
  return normalized.split(":")[0];
}

function isLoopbackHost(host: string | null): boolean {
  const hostname = normalizeHost(host);
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isVercelPreviewHost(host: string | null): boolean {
  const requestHost = normalizeHost(host);
  const deploymentHost = normalizeHost(process.env.VERCEL_URL);
  return deploymentHost.length > 0 && requestHost === deploymentHost;
}

export function isAiMonitorDemoRequest(host: string | null): boolean {
  const isLocalDemo = process.env.NODE_ENV === "development"
    && process.env.AI_MONITOR_LOCAL_DEMO === "true"
    && isLoopbackHost(host);
  const isPreviewDemo = process.env.VERCEL_ENV === "preview"
    && process.env.AI_MONITOR_PREVIEW_DEMO === "true"
    && isVercelPreviewHost(host);
  return isLocalDemo || isPreviewDemo;
}
