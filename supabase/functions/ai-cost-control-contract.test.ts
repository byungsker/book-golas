import {
  assert,
  assertMatch,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

const migrationPath =
  "supabase/migrations/20260829095530_add_ai_cost_controls.sql";
const migration = await Deno.readTextFile(migrationPath);

assertMatch(
  migration,
  /create table if not exists public\.ai_pricing_registry/,
);
assertMatch(migration, /ai_pricing_registry_immutable/);
assertMatch(
  migration,
  /create table if not exists public\.ai_usage_policy_versions/,
);
assertMatch(
  migration,
  /create table if not exists public\.ai_usage_control_events/,
);
assertMatch(migration, /create or replace function public\.reserve_ai_usage/);
assertMatch(migration, /hard_cap_exceeded/);
assertMatch(migration, /budget_exceeded/);
assertMatch(migration, /pricing_unavailable/);
assertMatch(migration, /usage_source text/);
assertMatch(migration, /estimated_calls/);
assertMatch(migration, /create or replace view public\.ai_usage_cost_summary/);
assertMatch(migration, /revoke all on public\.ai_pricing_registry/);
assertMatch(
  migration,
  /grant select on public\.ai_usage_cost_summary to service_role/,
);
assert(!migration.includes("OPENAI_API_KEY"));
assert(!migration.includes("SUPABASE_SERVICE_ROLE_KEY"));

console.log("AI cost-control migration contract passed");
