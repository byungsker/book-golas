import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

import { createHandler } from "./handler.ts";

async function authenticate(request: Request): Promise<boolean> {
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
    return error == null && user != null;
  } catch {
    return false;
  }
}

if (import.meta.main) {
  serve(
    createHandler({
      apiKey: Deno.env.get("ALADIN_TTB_KEY") ?? "",
      authenticate,
      fetchUpstream: fetch,
    }),
  );
}
