import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** Validate environment inputs before constructing a local admin client. */
function localTestConfig(env = process.env) {
  const url = env.BOOKGOLAS_TEST_SUPABASE_URL?.trim();
  const serviceRoleKey = env.BOOKGOLAS_TEST_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error("BOOKGOLAS_TEST_SUPABASE_URL and BOOKGOLAS_TEST_SUPABASE_SERVICE_ROLE_KEY are required");
  }
  const parsed = new URL(url);
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    !localHosts.has(parsed.hostname) ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error("disposable accounts are restricted to a local Supabase host");
  }
  return { url: parsed.toString().replace(/\/$/, ""), serviceRoleKey };
}

/** Construct a non-persisted admin client whose requests reject redirects. */
function createLocalAdminClient() {
  const { url, serviceRoleKey } = localTestConfig();
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, redirect: "error" }),
    },
  });
}

/** Create a local-only Supabase Auth user for a browser test. */
export async function createDisposableAccount(prefix = "playwright") {
  const supabaseAdmin = createLocalAdminClient();
  const id = crypto.randomUUID();
  const email = `${prefix}-${id}@local.invalid`;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: crypto.randomBytes(24).toString("base64url"),
      email_confirm: true,
      user_metadata: { disposable: true, test_id: id },
  });
  if (error || !data.user) {
    throw new Error(`disposable account creation failed: ${error?.status ?? "unknown"} ${error?.message ?? "missing user"}`);
  }
  return { id: data.user.id, email };
}

/** Delete a local-only Supabase Auth user, tolerating an already-cleaned account. */
export async function deleteDisposableAccount(userId) {
  const supabaseAdmin = createLocalAdminClient();
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    throw new Error("disposable account id must be a UUID");
  }
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error && error.status !== 404) {
    throw new Error(`disposable account deletion failed: ${error.status ?? "unknown"} ${error.message}`);
  }
}
