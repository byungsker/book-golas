import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type EdgeRequestContext,
  errorResponse,
  jsonResponse,
  withEdgeFunction,
} from "../_shared/edge-http.ts";

async function handleLogPushClick(
  req: Request,
  context: EdgeRequestContext,
): Promise<Response> {
  if (req.method !== "POST") {
    return errorResponse(
      context,
      "method_not_allowed",
      405,
      "Method not allowed",
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();
    if (userError || !user) {
      return errorResponse(context, "auth_unauthorized", 401, "Unauthorized");
    }

    const { logId, pushType } = await req.json();
    if (
      (typeof logId !== "string" || logId.trim().length === 0) &&
      (typeof pushType !== "string" || pushType.trim().length === 0)
    ) {
      return errorResponse(
        context,
        "validation_error",
        400,
        "logId or pushType is required",
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (typeof logId === "string" && logId.trim().length > 0) {
      const { data, error } = await adminClient
        .from("push_logs")
        .update({ is_clicked: true, clicked_at: new Date().toISOString() })
        .eq("id", logId)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      return jsonResponse({ success: data !== null }, 200, context);
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { data: recentLog, error: findError } = await adminClient
      .from("push_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("push_type", pushType)
      .eq("is_clicked", false)
      .gte("sent_at", oneDayAgo.toISOString())
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (findError) throw findError;
    if (!recentLog) return jsonResponse({ success: false }, 200, context);

    const { error: updateError } = await adminClient
      .from("push_logs")
      .update({ is_clicked: true, clicked_at: new Date().toISOString() })
      .eq("id", recentLog.id)
      .eq("user_id", user.id);
    if (updateError) throw updateError;

    return jsonResponse({ success: true, logId: recentLog.id }, 200, context);
  } catch {
    return errorResponse(
      context,
      "push_click_logging_failed",
      500,
      "Failed to log push click",
    );
  }
}

serve(withEdgeFunction("log-push-click", handleLogPushClick));
