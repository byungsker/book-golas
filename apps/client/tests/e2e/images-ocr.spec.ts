import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const bookId = "00000000-0000-4000-8000-000000004331";
const evidenceDirectory = path.resolve(process.cwd(), "../.omo/evidence/bookgolas-web-completion");
const evidencePath = path.join(evidenceDirectory, "task-13-images-ocr.png");
const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

async function setFixture(context: BrowserContext, fixture: string) {
  await context.addCookies([
    { name: "bookgolas-route-fixture", value: fixture, domain: "127.0.0.1", path: "/" },
    { name: "bookgolas-route-fixture", value: fixture, domain: "localhost", path: "/" },
  ]);
}

async function openDetail(page: Page, fixture: string) {
  await page.route("https://storage.example.invalid/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: tinyPng }));
  await setFixture(page.context(), fixture);
  await page.goto(`/en/books/${bookId}`);
  await page.getByTestId("book-detail-tab-memorable").click();
  await expect(page.getByTestId("images-ocr-panel")).toBeVisible();
}

async function chooseImage(page: Page) {
  await page.getByTestId("images-ocr-file-input").setInputFiles({
    name: "page.png",
    mimeType: "image/png",
    buffer: tinyPng,
  });
  await expect(page.getByTestId("images-ocr-upload-form")).toBeVisible();
}

test("upload, OCR and manual fallback keep a private image usable", async ({ page }) => {
  let providerCalls = 0;
  page.on("request", (request) => {
    if (request.url().includes("vision-ocr")) providerCalls += 1;
  });
  await openDetail(page, "images-ocr-happy");
  const panel = page.getByTestId("images-ocr-panel");

  await chooseImage(page);
  await panel.getByTestId("images-ocr-page").fill("18");
  await panel.getByTestId("images-ocr-caption").fill("A page worth keeping.");
  await panel.getByTestId("images-ocr-consent").check();
  await panel.getByTestId("images-ocr-upload").click();

  const image = panel.locator('[data-ocr-status="ready"]').first();
  await expect(image).toBeVisible();
  await expect(image).toContainText("OCR complete");
  await expect(image.getByTestId(/images-ocr-rendered-/)).toHaveAttribute("src", /^https:\/\//);
  expect(providerCalls).toBe(0);

  fs.mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: evidencePath, fullPage: true });
});

test("provider failure leaves the image available for manual text", async ({ page }) => {
  await openDetail(page, "images-ocr-provider-failure");
  const panel = page.getByTestId("images-ocr-panel");

  await chooseImage(page);
  await panel.getByTestId("images-ocr-consent").check();
  await panel.getByTestId("images-ocr-upload").click();

  const image = panel.locator('[data-testid^="images-ocr-image-"]').first();
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("data-ocr-status", "failed");
  await expect(image).toContainText("OCR provider is unavailable");
  await image.getByTestId(/images-ocr-manual-text-/).fill("Text entered after OCR failed.");
  await image.getByRole("button", { name: "Save manual text" }).click();
  await expect(image).toHaveAttribute("data-ocr-status", "manual");
  await expect(image).toContainText("Text entered after OCR failed.");
});

test("oversize image is rejected before upload", async ({ page }) => {
  await openDetail(page, "images-ocr-oversize");
  await page.getByTestId("images-ocr-file-input").setInputFiles({
    name: "oversize.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(8 * 1024 * 1024 + 1),
  });
  await expect(page.getByTestId("images-ocr-validation-error")).toContainText("8 MiB");
  await expect(page.getByTestId("images-ocr-upload-form")).toHaveCount(0);
});

test("denied camera exposes the file fallback", async ({ page }) => {
  await openDetail(page, "images-ocr-denied");
  const panel = page.getByTestId("images-ocr-panel");
  await panel.getByTestId("images-ocr-camera").click();
  await expect(panel.getByTestId("images-ocr-capture-state")).toContainText("permission was denied");
  await expect(panel.getByTestId("images-ocr-fallback-message")).toBeVisible();
});

test("insecure camera exposes the file fallback", async ({ page }) => {
  await openDetail(page, "images-ocr-insecure");
  const panel = page.getByTestId("images-ocr-panel");
  await panel.getByTestId("images-ocr-camera").click();
  await expect(panel.getByTestId("images-ocr-capture-state")).toContainText("secure connection");
  await expect(panel.getByTestId("images-ocr-fallback-message")).toBeVisible();
});

test("expired-url images remain rendered through a signed URL", async ({ page }) => {
  await openDetail(page, "images-ocr-expired-url");
  const panel = page.getByTestId("images-ocr-panel");
  const image = panel.locator('[data-testid^="images-ocr-image-"]').first();
  await expect(image).toBeVisible();
  await expect(image.getByTestId(/images-ocr-rendered-/)).toHaveAttribute("src", /^https:\/\//);
  await expect(image).toHaveAttribute("data-ocr-status", "ready");
});

test("named image source, replace, text and full-screen surfaces are actionable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDetail(page, "images-ocr-expired-url");
  const panel = page.getByTestId("images-ocr-panel");
  await panel.getByTestId("add-memorable-page").click();
  await expect(page.getByTestId("image-source")).toBeVisible();
  await page.keyboard.press("Escape");

  const image = panel.locator('[data-surface="existing-image"]').first();
  await image.getByTestId(/full-text-view-/).click();
  await expect(page.getByTestId("full-text-view")).toContainText("A signed image fixture.");
  await page.keyboard.press("Escape");

  await image.getByRole("button", { name: "Open full-screen image" }).click();
  await expect(page.getByTestId("full-screen-image")).toBeVisible();
  await page.keyboard.press("Escape");

  await image.getByTestId(/image-replace-options-/).click();
  await expect(page.getByTestId("image-replace-options")).toBeVisible();
  await page.getByRole("button", { name: "Choose replacement" }).click();
  await expect(page.getByTestId("image-replace-options")).toBeHidden();
  await expect(page.getByTestId("replace-image-confirmation")).toBeVisible();
  await page.waitForTimeout(250);
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDirectory, "task-13-images-ocr-mobile.png") });
});

test("wrong MIME is rejected before upload and OCR quota is distinct", async ({ page }) => {
  await openDetail(page, "images-ocr-happy");
  await page.getByTestId("images-ocr-file-input").setInputFiles({
    name: "page.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.getByTestId("images-ocr-validation-error")).toContainText("JPEG, PNG or WebP");

  await openDetail(page, "images-ocr-quota");
  await chooseImage(page);
  await page.getByTestId("images-ocr-consent").check();
  await page.getByTestId("images-ocr-upload").click();
  await expect(page.getByTestId("ocr-limit")).toContainText("quota");
});

test("memorable page sort menu orders every supported mode and OCR text copies", async ({ context, page }) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => undefined },
    });
  });
  await openDetail(page, "images-ocr-sort");
  const panel = page.getByTestId("images-ocr-panel");
  const cards = panel.locator('[data-surface="existing-image"]');
  const sort = panel.getByTestId("memorable-page-sort-select");

  await expect(panel.getByTestId("memorable-page-sort-menu")).toBeVisible();
  await sort.selectOption("page_asc");
  await expect(cards.first()).toHaveAttribute("data-page-number", "7");
  await sort.selectOption("page_desc");
  await expect(cards.first()).toHaveAttribute("data-page-number", "91");
  await sort.selectOption("date_asc");
  await expect(cards.first()).toHaveAttribute("data-created-at", "2026-09-16T00:00:00.000Z");
  await sort.selectOption("date_desc");
  await expect(cards.first()).toHaveAttribute("data-created-at", "2026-09-18T00:00:00.000Z");

  await cards.first().getByTestId(/extracted-text-copy-/).click();
  await expect(cards.first()).toContainText("Copied");
  await cards.first().getByTestId(/full-text-view-/).click();
  await page.getByTestId("full-text-copy").click();
  await expect(page.getByTestId("full-text-copy")).toContainText("Copied");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("full-text-view")).toBeHidden();

  fs.mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDirectory, "task-13-memorable-page-sort-menu.png"), fullPage: true });
});
