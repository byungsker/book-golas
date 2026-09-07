import assert from "node:assert/strict"
import test from "node:test"
import { assertLocalSupabaseUrl, createFixtureAdminClient } from "../fixtures/disposable-account.mjs"
import { FIXTURE_BOOKS, FIXTURE_IMAGES, FIXTURE_USERS, fixtureManifest } from "../fixtures/manifest.mjs"

test("fixture manifest keeps users, books, and images isolated", () => {
  const manifest = fixtureManifest()
  const userIds = new Set(FIXTURE_USERS.map(({ id }) => id))

  assert.equal(manifest.users.length, 2)
  assert.equal(manifest.books.length, 2)
  assert.equal(manifest.images.length, 2)
  assert.equal(new Set(FIXTURE_BOOKS.map(({ owner }) => owner)).size, 2)
  assert.equal(new Set(FIXTURE_IMAGES.map(({ owner }) => owner)).size, 2)
  assert.equal(userIds.size, 2)
})

test("fixture admin clients reject non-local Supabase targets", () => {
  assert.equal(assertLocalSupabaseUrl("http://127.0.0.1:54321/"), "http://127.0.0.1:54321")
  assert.throws(() => assertLocalSupabaseUrl("https://example.supabase.co"), /local Supabase URL/)
  assert.throws(
    () => createFixtureAdminClient({ url: "http://localhost:54321", serviceRoleKey: "" }),
    /SUPABASE_SERVICE_ROLE_KEY/,
  )
})
