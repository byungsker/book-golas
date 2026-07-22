import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
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
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { logId, pushType } = await req.json();
    if (
      (typeof logId !== "string" || logId.trim().length === 0) &&
      (typeof pushType !== "string" || pushType.trim().length === 0)
    ) {
      return jsonResponse({ error: "logId or pushType is required" }, 400);
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
      return jsonResponse({ success: data !== null }, 200);
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
    if (!recentLog) return jsonResponse({ success: false }, 200);

    const { error: updateError } = await adminClient
      .from("push_logs")
      .update({ is_clicked: true, clicked_at: new Date().toISOString() })
      .eq("id", recentLog.id)
      .eq("user_id", user.id);
    if (updateError) throw updateError;

    return jsonResponse({ success: true, logId: recentLog.id }, 200);
  } catch (error: unknown) {
    console.error("Push click logging failed:", error);
    return jsonResponse({ error: "Failed to log push click" }, 500);
  }
});
