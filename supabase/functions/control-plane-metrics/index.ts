import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

import { createHandler, type GrowthMetrics } from "./handler.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const expectedToken = Deno.env.get("CONTROL_PLANE_METRICS_TOKEN") ?? "";
const environmentSetting = Deno.env.get("CONTROL_PLANE_ENVIRONMENT") ?? "";
const environment = environmentSetting === "production"
  ? "production"
  : environmentSetting === "development"
  ? "development"
  : "development";

const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const handler = createHandler({
  productId: "bookgolas",
  environment,
  configurationValid: (
    (environmentSetting === "development" ||
      environmentSetting === "production") &&
    expectedToken.length >= 32
  ),
  expectedToken,
  now: () => new Date(),
  loadMetrics: async () => {
    const { data, error } = await serviceClient.rpc(
      "get_control_plane_growth_metrics",
    );
    if (error || data === null || typeof data !== "object") {
      throw new Error("Metrics unavailable");
    }
    return data as GrowthMetrics;
  },
});

serve(handler);
