import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAiMonitorDemoRequest } from "@/lib/ai-monitor-access";

export async function requireAiMonitorPreview(): Promise<void> {
  const requestHeaders = await headers();
  if (!isAiMonitorDemoRequest(requestHeaders.get("host"))) {
    redirect("/admin/login?error=admin_disabled");
  }
}
