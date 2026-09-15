import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const bookId = "00000000-0000-4000-8000-000000004331";
const evidenceDirectory = path.resolve(process.cwd(), "../.omo/evidence/bookgolas-web-app-parity");
const evidencePath = path.join(evidenceDirectory, "task-24-bookgolas-web-parity.png");
const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

async function setFixture(context: BrowserContext, fixture: string) {
  await context.addCookies([
    { name: "bookgolas-route-fixture", value: fixture, domain: "127.0.0.1", path: "/" },
    { name: "bookgolas-route-fixture", value: fixture, domain: "localhost", path: "/" },
  ]);
}

async function openDetail(page: Page, fixture: string) {
  await setFixture(page.context(), fixture);
  await page.goto(`/en/books/${bookId}`);
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
