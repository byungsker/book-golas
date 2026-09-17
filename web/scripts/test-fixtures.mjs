import fs from "node:fs";
import path from "node:path";

const webRoot = path.resolve(import.meta.dirname, "..");
const fixtureRoot = path.join(webRoot, "fixtures/supabase");
const manifestPath = path.join(fixtureRoot, "consumer-fixtures.json");
const seedPath = path.join(fixtureRoot, "seed.sql");
const resetScriptPath = path.join(webRoot, "scripts/reset-local-fixtures.mjs");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const seed = fs.readFileSync(seedPath, "utf8");
const normalizedSeed = seed
  .replace(/\s+/g, " ")
  .replace(/\(\s+/g, "(")
  .replace(/\s+\)/g, ")")
  .trim();
const resetScript = fs.readFileSync(resetScriptPath, "utf8");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const secretPatterns = [
  /service[_-]?role[_-]?key\s*[:=]\s*[^$\s]+/i,
  /\bsk-[A-Za-z0-9]{20,}\b/,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
];
const failures = [];
/** Collect a fixture contract failure without hiding additional violations. */
const requireCondition = (condition, message) => {
  if (!condition) failures.push(message);
};
const sqlLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;
const containsSeedRow = (values) => normalizedSeed.includes(`(${values.join(", ")})`);
const toSeedTimestamp = (value) => value.replace(".000Z", "Z");

requireCondition(manifest.schema_version === 1, "fixture schema_version must be 1");
requireCondition(manifest.fixture_id === "bookgolas-web-414", "fixture id is not pinned");
requireCondition(manifest.users.length === 2, "fixture must contain User A and User B");
requireCondition(manifest.books.length === 2, "fixture must contain two books");
requireCondition(manifest.images.length === 2, "fixture must contain two images");
requireCondition(seed.includes("INSERT INTO storage.buckets"), "seed is missing the book-images bucket");
requireCondition(/VALUES \('book-images', 'book-images', false\)/.test(normalizedSeed), "book-images bucket must be private");
requireCondition(
  !/\b(?:delete|update|insert\s+into)\s+storage\.objects\b/i.test(seed),
  "seed must not mutate storage.objects directly",
);
requireCondition(resetScript.includes('"--local"'), "reset script must remain local-only");
requireCondition(
  resetScript.includes('"../web/fixtures/supabase/seed.sql"'),
  "reset script must resolve the seed path from the Supabase directory",
);
requireCondition(resetScript.includes('storage.from("book-images")'), "reset script is missing storage upload");
requireCondition(resetScript.includes("upsert: true"), "storage fixture upload must be idempotent");

const userKeys = new Set();
const userIds = new Set();
const usersByKey = new Map(manifest.users.map((user) => [user.key, user]));
for (const user of manifest.users) {
  requireCondition(uuid.test(user.id), `invalid user UUID: ${user.key}`);
  requireCondition(!userIds.has(user.id), `duplicate user UUID: ${user.id}`);
  requireCondition(!userKeys.has(user.key), `duplicate user key: ${user.key}`);
  requireCondition(user.email.endsWith("@local.invalid"), `fixture email must use .invalid: ${user.key}`);
  userKeys.add(user.key);
  userIds.add(user.id);
  requireCondition(
    containsSeedRow([
      sqlLiteral(user.id),
      sqlLiteral(user.email),
      sqlLiteral(user.nickname),
      sqlLiteral(user.nickname),
      `${sqlLiteral(`{"fixture_key":"${user.key}"}`)}::jsonb`,
    ]),
    `seed is missing the exact public user row for ${user.key}`,
  );
}

const bookKeys = new Set();
const bookIds = new Set();
const booksByKey = new Map(manifest.books.map((book) => [book.key, book]));
for (const book of manifest.books) {
  requireCondition(uuid.test(book.id), `invalid book UUID: ${book.key}`);
  requireCondition(!bookIds.has(book.id), `duplicate book UUID: ${book.id}`);
  requireCondition(userKeys.has(book.user_key), `book owner is missing: ${book.key}`);
  requireCondition(book.current_page <= book.total_pages, `book progress exceeds total: ${book.key}`);
  requireCondition(["planned", "reading", "completed", "will_retry"].includes(book.status), `invalid book status: ${book.key}`);
  bookKeys.add(book.key);
  bookIds.add(book.id);
  const owner = usersByKey.get(book.user_key);
  if (owner) {
    requireCondition(
      containsSeedRow([
        sqlLiteral(book.id),
        sqlLiteral(book.title),
        sqlLiteral(book.author),
        sqlLiteral(toSeedTimestamp(book.start_date)),
        sqlLiteral(toSeedTimestamp(book.target_date)),
        "NULL",
        book.current_page,
        book.total_pages,
        sqlLiteral(owner.id),
        sqlLiteral(book.status),
        book.attempt_count,
      ]),
      `seed is missing the exact book relationship for ${book.key}`,
    );
  }
}

for (const image of manifest.images) {
  requireCondition(uuid.test(image.id), `invalid image UUID: ${image.key}`);
  requireCondition(userKeys.has(image.user_key), `image owner is missing: ${image.key}`);
  requireCondition(bookKeys.has(image.book_key), `image book is missing: ${image.key}`);
  requireCondition(image.mime_type === "image/png", `unexpected image type: ${image.key}`);
  const assetPath = path.resolve(webRoot, "..", image.asset_path);
  const assetRelativePath = path.relative(webRoot, assetPath);
  requireCondition(
    assetRelativePath !== "" &&
      assetRelativePath !== ".." &&
      !assetRelativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(assetRelativePath),
    `image asset escapes Web fixture root: ${image.key}`,
  );
  requireCondition(fs.existsSync(assetPath), `image asset is missing: ${image.asset_path}`);
  const owner = usersByKey.get(image.user_key);
  const book = booksByKey.get(image.book_key);
  const imageLabel = image.key.match(/_([ab])_image$/i)?.[1]?.toUpperCase();
  if (owner && book && imageLabel) {
    requireCondition(
      containsSeedRow([
        sqlLiteral(image.id),
        sqlLiteral(book.id),
        "NULL",
        sqlLiteral(`Fixture image ${imageLabel}`),
        sqlLiteral(owner.id),
        image.page_number,
        sqlLiteral("book-images"),
        sqlLiteral(image.storage_path),
        sqlLiteral(image.mime_type),
        68,
        sqlLiteral("not_requested"),
        "NULL",
      ]),
      `seed is missing the exact image relationship for ${image.key}`,
    );
  }
}

const trackedFixtureFiles = [manifestPath, seedPath];
for (const filePath of trackedFixtureFiles) {
  const contents = fs.readFileSync(filePath, "utf8");
  requireCondition(!secretPatterns.some((pattern) => pattern.test(contents)), `possible secret in ${filePath}`);
}

const negativeSecretFixture = fs.readFileSync(
  path.join(fixtureRoot, "negative/unlabeled-service-role.txt"),
  "utf8",
);
requireCondition(
  secretPatterns.some((pattern) => pattern.test(negativeSecretFixture)),
  "unlabeled JWT negative fixture was not detected",
);

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("fixture contract passed: 2 isolated users, 2 books, 2 images, local-only credentials and reset seed");
