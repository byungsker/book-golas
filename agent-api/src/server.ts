import { SupabaseAuthenticator } from "./auth.ts";
import { createAgentApiHandler } from "./handler.ts";
import { SupabaseDataSource } from "./supabase-data-source.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const port = Number(Deno.env.get("AGENT_API_PORT") ?? "8787");

const handler = createAgentApiHandler({
  authenticator: new SupabaseAuthenticator(supabaseUrl, supabaseAnonKey),
  dataSource: new SupabaseDataSource(supabaseUrl, supabaseAnonKey),
});

Deno.serve({ port }, handler);
