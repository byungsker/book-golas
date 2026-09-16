import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const paths = {
  contract: path.join(root, "docs/images-ocr-contract.json"),
  fixture: path.join(root, "scripts/fixtures/images-ocr-negative.json"),
  schema: path.join(root, "src/lib/product/contracts/images-ocr.ts"),
  schemaTest: path.join(root, "src/lib/product/contracts/images-ocr.test.ts"),
  storage: path.join(root, "src/lib/product/adapters/storage.ts"),
  storageTest: path.join(root, "src/lib/product/adapters.storage.test.ts"),
  dal: path.join(root, "src/lib/product/dal/consumer-images.ts"),
  dalTest: path.join(root, "src/lib/product/dal.consumer-images.test.ts"),
  route: path.join(root, "src/app/api/consumer/images-ocr/route.ts"),
  routeTest: path.join(root, "src/app/api/consumer/images-ocr/route.test.ts"),
  fixtureSource: path.join(root, "src/lib/consumer/images-ocr-fixtures.ts"),
  client: path.join(root, "src/components/consumer/book-image-capture-client.tsx"),
  e2e: path.join(root, "tests/e2e/images-ocr.spec.ts"),
  seed: path.join(root, "fixtures/supabase/seed.sql"),
  migration: path.join(root, "../supabase/migrations/20260915220228_private_book_images_ocr.sql"),
  deleteBook: path.join(root, "src/lib/product/dal/writes.ts"),
  package: path.join(root, "package.json"),
};

const failures = [];
const requireCondition = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const [name, filePath] of Object.entries(paths)) {
  requireCondition(fs.existsSync(filePath), `missing images-ocr ${name}: ${path.relative(root, filePath)}`);
  if (fs.existsSync(filePath)) requireCondition(fs.statSync(filePath).size > 0, `empty images-ocr ${name}: ${path.relative(root, filePath)}`);
}

if (failures.length === 0) {
  const contract = JSON.parse(fs.readFileSync(paths.contract, "utf8"));
  const fixture = JSON.parse(fs.readFileSync(paths.fixture, "utf8"));
  const packageJson = JSON.parse(fs.readFileSync(paths.package, "utf8"));
  const source = Object.fromEntries(Object.entries(paths).map(([name, filePath]) => [name, fs.readFileSync(filePath, "utf8")]));

  requireCondition(contract.issue === 435 && contract.task === 24, "images-ocr contract must bind issue 435 task 24");
  requireCondition(contract.plan === ".omo/plans/bookgolas-web-app-parity.md", "images-ocr contract must reference the parity plan");
  requireCondition(JSON.stringify(contract.locales) === JSON.stringify(["ko", "en"]), "images-ocr must cover Korean and English");
  requireCondition(Array.isArray(contract.parityRows) && contract.parityRows.length >= 3, "images-ocr parity rows must map native surfaces to Web dispositions");
  requireCondition(contract.native.references.includes("supabase/functions/vision-ocr/index.ts"), "native vision-ocr reference is missing");
  for (const state of ["loading", "empty", "error", "unauthorized", "consent", "quota", "offline", "no_camera", "insecure_context", "permission_denied", "unsupported", "oversize", "wrong_mime", "corrupt", "provider_failure"]) requireCondition(contract.states.includes(state), `images-ocr contract must cover ${state}`);
  for (const invariant of ["private_bucket_is_not_public", "storage_path_starts_with_authenticated_user_and_book", "supported_mime_and_magic_bytes_are_required", "file_size_is_at_most_8_mib", "signed_urls_are_used_for_rendering", "signed_urls_are_renewed_before_expiry", "ocr_requires_explicit_consent", "ocr_failure_keeps_image_and_manual_text_available", "foreign_images_are_not_found", "book_delete_removes_all_owned_image_objects"]) requireCondition(contract.invariants.includes(invariant), `missing invariant ${invariant}`);
  requireCondition(fixture.issue === 435 && fixture.fixtures.length >= 11, "images-ocr negative fixtures must cover browser and server boundaries");
  requireCondition(packageJson.scripts["test:images-ocr"] === "node scripts/test-images-ocr.mjs && vitest run src/lib/product/contracts/images-ocr.test.ts src/lib/product/adapters.storage.test.ts src/lib/product/dal.consumer-images.test.ts src/app/api/consumer/images-ocr/route.test.ts", "package must expose the exact images-ocr acceptance command");
  requireCondition(packageJson.scripts["test:images-ocr:negative"].includes("--fixture oversize") && packageJson.scripts["test:images-ocr:negative"].includes("--fixture provider-failure"), "package must expose images-ocr negative fixtures");
  requireCondition(source.schema.includes("maxBookImageBytes") && source.schema.includes("imageSignatureMatches") && source.schema.includes("validateBookImageBytes"), "schema must enforce the 8 MiB and magic-byte boundary");
  requireCondition(source.storage.includes("privateBookImagesBucket") && source.storage.includes("createSignedUrl") && source.storage.includes("remove"), "storage adapter must upload, sign and remove private objects");
  requireCondition(source.dal.includes("runVisionOcr") && source.dal.includes("ocrConsent") && source.dal.includes("manualText") && source.dal.includes("deleteOwnedBookImages"), "DAL must separate OCR consent, manual fallback and book cleanup");
  requireCondition(source.route.includes("formData") && source.route.includes("ImagesOcrUploadMetadataSchema") && source.route.includes("private, no-store"), "API must parse multipart upload and remain private");
  requireCondition(source.client.includes("getUserMedia") && source.client.includes("isSecureContext") && source.client.includes('capture="environment"') && source.client.includes("file_fallback") && source.client.includes("manual"), "client must expose camera fallback and manual OCR");
  requireCondition(source.client.includes("signedUrl") && !source.client.includes("/public/"), "client must render signed URLs and never public storage URLs");
  requireCondition(!source.seed.includes("/storage/v1/object/public/book-images/"), "fixture seed must not publish book image URLs");
  requireCondition(source.migration.includes("public = false") && source.migration.includes("storage.objects") && source.migration.includes("auth.uid()"), "migration must make bucket private and scope storage objects");
  requireCondition(source.deleteBook.includes("deleteOwnedBookImages"), "book deletion must run image object cleanup");
  requireCondition(source.e2e.includes("upload, OCR and manual") && source.e2e.includes("oversize") && source.e2e.includes("expired-url") && source.e2e.includes("provider"), "browser suite must name issue-defined scenarios");

  if (process.argv[2] === "--fixture") {
    const name = process.argv[3];
    requireCondition(fixture.fixtures.some((entry) => entry.name === name), `missing images-ocr fixture ${name}`);
    if (name === "oversize") requireCondition(source.schema.includes("maxBookImageBytes") && source.client.includes("byteLength"), "oversize must be checked in schema and client");
    if (name === "wrong-mime") requireCondition(source.schema.includes("bookImageMimeTypeValues") && source.client.includes("wrong_mime"), "wrong MIME must be rejected before upload");
    if (name === "corrupt") requireCondition(source.schema.includes("imageSignatureMatches") && source.client.includes("corrupt"), "corrupt input must be rejected by magic bytes");
    if (name === "insecure" || name === "denied") requireCondition(source.client.includes("fileInputRef.current?.click") && source.client.includes("file_fallback"), "camera failures must expose file fallback");
    if (name === "expired-url") requireCondition(source.storage.includes("signedUrlRefreshSkewSeconds") && source.client.includes("loadImages"), "expired URLs must trigger renewal");
    if (name === "provider-failure") requireCondition(source.dal.includes('"failed"') && source.client.includes("manualText") && source.e2e.includes("manual"), "provider failure must preserve manual fallback");
  }
}

if (failures.length > 0) {
  console.error(`images-ocr contract failed with ${failures.length} error(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`images-ocr contract passed${process.argv[2] === "--fixture" ? ` (${process.argv[3]})` : ""}`);
