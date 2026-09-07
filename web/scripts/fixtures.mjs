import { readFile } from "node:fs/promises"
import { execFileSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  FIXTURE_BOOKS,
  FIXTURE_IDS,
  FIXTURE_IMAGES,
  FIXTURE_USERS,
  fixtureEmail,
  fixtureManifest,
} from "../tests/fixtures/manifest.mjs"
import { createFixtureAdminClient, disposablePassword } from "../tests/fixtures/disposable-account.mjs"

const scriptPath = fileURLToPath(import.meta.url)
const scriptDirectory = dirname(scriptPath)
const repositoryRoot = resolve(scriptDirectory, "../..")
const seedPath = resolve(scriptDirectory, "../fixtures/seed.sql")

function assertUnique(values, label) {
  if (new Set(values).size !== values.length) {
    throw new Error(`${label} must be unique`)
  }
}

async function validateSeedFile() {
  const sql = await readFile(seedPath, "utf8")
  const requiredFragments = [
    "INSERT INTO public.users",
    "INSERT INTO public.books",
    "INSERT INTO public.book_images",
    FIXTURE_IDS.userA,
    FIXTURE_IDS.userB,
    FIXTURE_IDS.bookA,
    FIXTURE_IDS.bookB,
    FIXTURE_IDS.imageA,
    FIXTURE_IDS.imageB,
    "fixture://image-a",
    "fixture://image-b",
  ]

  for (const fragment of requiredFragments) {
    if (!sql.includes(fragment)) {
      throw new Error(`Seed file is missing ${fragment}`)
    }
  }

  if (/service.role|service_role|eyJ[a-zA-Z0-9_-]{20,}/i.test(sql)) {
    throw new Error("Seed file contains a credential-like value")
  }

  if (!sql.includes("ON CONFLICT (id) DO UPDATE")) {
    throw new Error("Seed file must be idempotent")
  }
}

function validateManifest() {
  const manifest = fixtureManifest()
  assertUnique(manifest.users.map(({ id }) => id), "fixture user IDs")
  assertUnique(manifest.books.map(({ id }) => id), "fixture book IDs")
  assertUnique(manifest.images.map(({ id }) => id), "fixture image IDs")

  const userKeys = new Set(manifest.users.map(({ key }) => key))
  for (const book of manifest.books) {
    if (!userKeys.has(book.owner)) {
      throw new Error(`Book ${book.key} has an unknown owner`)
    }
  }

  for (const image of manifest.images) {
    if (!userKeys.has(image.owner)) {
      throw new Error(`Image ${image.key} has an unknown owner`)
    }
  }

  for (const user of FIXTURE_USERS) {
    const email = fixtureEmail(user.handle)
    if (!email.endsWith("@fixture.invalid")) {
      throw new Error("Fixture emails must use the reserved invalid domain")
    }
  }
}

function localEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error("Live fixtures require local Supabase URL and service role key")
  }
  return { url, serviceRoleKey }
}

function resetLocalDatabase() {
  const { url } = localEnvironment()
  createFixtureAdminClient({ url, serviceRoleKey: "fixture-reset-check" })
  execFileSync("supabase", ["db", "reset", "--local", "--no-seed"], {
    cwd: repositoryRoot,
    stdio: "inherit",
  })
}

async function ensureLiveFixtures() {
  const { url, serviceRoleKey } = localEnvironment()
  const admin = createFixtureAdminClient({ url, serviceRoleKey })

  const users = []
  for (const fixtureUser of FIXTURE_USERS) {
    const email = fixtureEmail(fixtureUser.handle)
    const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existing = listed.data.users.find((user) => user.email === email)
    if (existing) {
      users.push(existing)
      continue
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: disposablePassword(),
      email_confirm: true,
      user_metadata: { fixture: true, owner: fixtureUser.key },
    })
    if (error || !data.user) {
      throw new Error(`Failed to create ${fixtureUser.key}`, { cause: error })
    }
    users.push(data.user)
  }

  const ownerByKey = new Map(users.map((user, index) => [FIXTURE_USERS[index].key, user.id]))
  const books = FIXTURE_BOOKS.map((book) => ({
    id: book.id,
    title: book.title,
    author: `Fixture Author ${book.owner === "userA" ? "A" : "B"}`,
    start_date: "2026-01-01T00:00:00Z",
    target_date: "2026-01-31T00:00:00Z",
    image_url: `fixture://${book.key}`,
    current_page: book.owner === "userA" ? 12 : 24,
    total_pages: book.owner === "userA" ? 120 : 240,
    user_id: ownerByKey.get(book.owner),
    status: book.owner === "userA" ? "reading" : "planned",
    attempt_count: 1,
  }))
  const { error: booksError } = await admin.from("books").upsert(books, { onConflict: "id" })
  if (booksError) {
    throw new Error("Failed to seed fixture books", { cause: booksError })
  }

  const images = FIXTURE_IMAGES.map((image) => ({
    id: image.id,
    book_id: FIXTURE_IDS[image.book],
    image_url: `fixture://${image.key}`,
    caption: `Fixture image ${image.owner === "userA" ? "A" : "B"}`,
    user_id: ownerByKey.get(image.owner),
    extracted_text: `Fixture text ${image.owner === "userA" ? "A" : "B"}`,
    page_number: image.owner === "userA" ? 12 : 24,
  }))
  const { error: imagesError } = await admin.from("book_images").upsert(images, { onConflict: "id" })
  if (imagesError) {
    throw new Error("Failed to seed fixture images", { cause: imagesError })
  }

  const { data: seededBooks, error: verifyError } = await admin
    .from("books")
    .select("id,user_id")
    .in("id", books.map(({ id }) => id))
  if (verifyError || seededBooks?.length !== books.length) {
    throw new Error("Fixture book ownership verification failed", { cause: verifyError })
  }

  return {
    users: users.length,
    books: seededBooks.length,
    images: images.length,
  }
}

async function main() {
  validateManifest()
  await validateSeedFile()

  const live = process.env.FIXTURES_LIVE === "1"
  if (!live) {
    console.log("Fixtures OK: 2 isolated users, 2 books, 2 images")
    console.log("Live local seeding is opt-in with FIXTURES_LIVE=1")
    return
  }

  if (process.env.FIXTURES_RESET === "1") {
    resetLocalDatabase()
  }

  const result = await ensureLiveFixtures()
  console.log(`Fixtures OK: ${result.users} users, ${result.books} books, ${result.images} images`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Fixture validation failed")
  process.exitCode = 1
})
