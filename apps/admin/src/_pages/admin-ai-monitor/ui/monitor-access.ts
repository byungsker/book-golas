import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAiMonitorDemoRequest } from "@/entities/ai-monitoring/api/ai-monitor-access";

export async function requireAiMonitorPreview(): Promise<void> {
  const requestHeaders = await headers();
  if (!isAiMonitorDemoRequest(requestHeaders.get("host"))) {
    redirect("/login?error=admin_disabled");
  }
}
