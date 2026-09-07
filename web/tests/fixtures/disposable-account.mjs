import { randomBytes } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { FIXTURE_NAMESPACE, fixtureEmail } from "./manifest.mjs"

const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "localhost", "::1"])

export function assertLocalSupabaseUrl(value) {
  let parsed
  try {
    parsed = new URL(value)
  } catch (error) {
    throw new Error("A valid local Supabase URL is required", { cause: error })
  }

  if (!LOCAL_HOSTNAMES.has(parsed.hostname)) {
    throw new Error("Fixture helpers only accept a local Supabase URL")
  }

  return parsed.toString().replace(/\/$/, "")
}

export function createFixtureAdminClient({ url, serviceRoleKey }) {
  const localURL = assertLocalSupabaseUrl(url)
  if (!serviceRoleKey?.trim()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for live fixtures")
  }

  return createClient(localURL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function disposablePassword() {
  return process.env.FIXTURE_TEST_PASSWORD?.trim() || randomBytes(24).toString("base64url")
}

export async function createDisposableAccount({ adminClient, label }) {
  const email = `${FIXTURE_NAMESPACE}-${label}-${randomBytes(8).toString("hex")}@fixture.invalid`
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: disposablePassword(),
    email_confirm: true,
    user_metadata: { fixture: true },
  })

  if (error || !data.user) {
    throw new Error("Failed to create disposable fixture account", { cause: error })
  }

  return data.user
}

export async function deleteDisposableAccount({ adminClient, userId }) {
  const { error } = await adminClient.auth.admin.deleteUser(userId)
  if (error) {
    throw new Error("Failed to delete disposable fixture account", { cause: error })
  }
}

export { fixtureEmail }
