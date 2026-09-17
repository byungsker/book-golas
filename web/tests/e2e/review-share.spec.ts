import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const bookId = "00000000-0000-4000-8000-000000004331";
const evidenceDirectory = path.resolve(process.cwd(), "../.omo/evidence/bookgolas-web-app-parity");
const evidencePath = path.join(evidenceDirectory, "task-25-bookgolas-web-app-parity.png");

async function setFixture(context: BrowserContext, fixture: string) {
  await context.addCookies([
    { name: "bookgolas-route-fixture", value: fixture, domain: "127.0.0.1", path: "/" },
    { name: "bookgolas-route-fixture", value: fixture, domain: "localhost", path: "/" },
  ]);
}

async function openReview(page: Page, fixture: string) {
  await setFixture(page.context(), fixture);
  await page.goto(`/en/books/${bookId}/review`, { waitUntil: "networkidle" });
  await expect(page.getByTestId("review-editor")).toBeVisible();
}

test("save, draft and share review outcomes", async ({ context, page }) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (value: string) => { (window as typeof window & { __copied?: string }).__copied = value; } },
    });
  });
  await openReview(page, "review-share-happy");

  await page.getByTestId("review-short-text").fill("A review written in the browser.");
  await page.getByTestId("review-long-text").fill("The longer reflection remains available while an AI draft is generated.");
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("review-short-text")).toHaveValue("A review written in the browser.");
  await expect(page.getByTestId("review-long-text")).toHaveValue("The longer reflection remains available while an AI draft is generated.");
  await page.getByTestId("review-rating-5").click();
  await page.getByTestId("review-ai-consent").check();
  await page.getByTestId("review-ai-generate").click();
  await expect(page.getByTestId("review-ai-draft")).toBeVisible();
  await page.getByTestId("review-ai-use-draft").click();
  await expect(page.getByTestId("review-long-text")).toHaveValue(/This book gave me/);

  await page.getByTestId("review-save").click();
  await expect(page.getByTestId("review-save-status")).toBeVisible();

  await page.getByTestId("review-share").click();
  await expect(page.getByTestId("review-share-status")).toContainText("copied");
  const download = page.waitForEvent("download");
  await page.getByTestId("review-download").click();
  await expect((await download).suggestedFilename()).toMatch(/share-card\.txt$/);

  fs.mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: evidencePath, fullPage: true });
});

test("consent is required before generating a draft", async ({ page }) => {
  await openReview(page, "review-share-happy");
  await page.getByTestId("review-ai-generate").click();
  await expect(page.getByTestId("review-ai-consent-error")).toBeVisible();
  await expect(page.getByTestId("review-editor")).toHaveAttribute("data-review-ai-state", "consent");
});

test("provider failure preserves an unsaved review", async ({ page }) => {
  await openReview(page, "review-share-provider");
  await page.getByTestId("review-long-text").fill("Keep this text when generation fails.");
  await page.getByTestId("review-ai-consent").check();
  await page.getByTestId("review-ai-generate").click();
  await expect(page.getByTestId("review-ai-error")).toBeVisible();
  await expect(page.getByTestId("review-long-text")).toHaveValue("Keep this text when generation fails.");
  await expect(page.getByTestId("review-editor")).toHaveAttribute("data-review-ai-state", "provider_error");
});

test("clipboard failure uses the download fallback", async ({ context, page }) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => { throw new Error("clipboard unavailable"); } },
    });
    document.execCommand = () => false;
  });
  await openReview(page, "review-share-happy");
  const download = page.waitForEvent("download");
  await page.getByTestId("review-share").click();
  await expect((await download).suggestedFilename()).toMatch(/share-card\.txt$/);
  await expect(page.getByTestId("review-share-status")).toContainText("downloaded");
  await expect(page.getByTestId("review-canonical-url")).toHaveAttribute("href", new RegExp(`/en/books/${bookId}/review$`));
});
