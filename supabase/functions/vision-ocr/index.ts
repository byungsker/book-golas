import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

import { hasThirdPartyAiConsent } from "../_shared/third-party-ai-consent.ts";
import { createHandler } from "./handler.ts";

async function authenticate(request: Request): Promise<string | null> {
  try {
    const authHeader = request.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return error == null && user != null ? user.id : null;
  } catch {
    return null;
  }
}

async function hasConsent(request: Request, userId: string): Promise<boolean> {
  const authHeader = request.headers.get("Authorization") ?? "";
  const client = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  return await hasThirdPartyAiConsent(
    client,
    userId,
    "google_cloud_vision",
  );
}

if (import.meta.main) {
  serve(
    createHandler({
      apiKey: Deno.env.get("GOOGLE_CLOUD_VISION_API_KEY") ?? "",
      authenticate,
      hasConsent,
      fetchUpstream: fetch,
    }),
  );
}
