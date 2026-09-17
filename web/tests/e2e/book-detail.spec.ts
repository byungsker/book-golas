import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const readingBookId = "00000000-0000-4000-8000-000000004331";
const plannedBookId = "00000000-0000-4000-8000-000000004332";
const pausedBookId = "00000000-0000-4000-8000-000000004333";
const evidenceDirectory = path.resolve(process.cwd(), "../.omo/evidence/bookgolas-web-app-parity");

async function setFixture(context: BrowserContext, value: string) {
  await context.addCookies([
    { name: "bookgolas-route-fixture", value, domain: "127.0.0.1", path: "/" },
    { name: "bookgolas-route-fixture", value, domain: "localhost", path: "/" },
  ]);
}

async function capture(page: Page, name: string) {
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDirectory, name), fullPage: true });
}

test("detail exposes metadata and completes before a confirmed delete", async ({ context, page }) => {
  await setFixture(context, "book-detail-reading");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto(`/en/books/${readingBookId}`, { waitUntil: "networkidle" });

  await expect(page.getByTestId("book-detail")).toHaveAttribute("data-book-status", "reading");
  await expect(page.getByTestId("book-detail-metadata")).toBeVisible();
  await expect(page.getByTestId("book-detail-attempt")).toContainText("Attempt 1");
  await expect(page.getByTestId("book-detail-review-link")).toBeVisible();
  await expect(page.getByTestId("book-detail-action-pause")).toBeVisible();
  await expect(page.getByTestId("book-detail-action-complete")).toBeVisible();
  await expect(page.getByTestId("book-detail-action-delete")).toBeVisible();

  await page.getByTestId("book-detail-action-complete").click();
  await expect(page.getByTestId("book-detail-updated")).toBeVisible();
  await expect(page.getByTestId("book-detail-live")).toHaveAttribute("data-book-status", "completed");
  await expect(page.getByTestId("book-detail-completed-state")).toBeVisible();
  await expect(page.getByTestId("book-detail-action-complete")).toHaveCount(0);

  await page.getByTestId("book-detail-action-delete").click();
  await expect(page.getByTestId("book-detail-delete-dialog")).toBeVisible();
  await page.getByTestId("book-detail-delete-cancel").click();
  await expect(page.getByTestId("book-detail")).toBeVisible();
  await expect(page.getByTestId("book-detail-delete-dialog")).toBeHidden();

  await page.getByTestId("book-detail-action-delete").click();
  await page.getByTestId("book-detail-delete-confirm").click();
  await expect(page.getByTestId("book-detail-deleted")).toBeVisible();
  await expect(page.getByTestId("book-detail-live")).toHaveAttribute("data-book-status", "deleted");
  await expect(page.getByTestId("book-detail-deleted").getByRole("link")).toHaveAttribute("href", "/en/home");
  await capture(page, "task-20-bookgolas-web-app-parity.png");
});

test("detail supports planned start and paused resume actions", async ({ context, page }) => {
  await setFixture(context, "book-detail-planned");
  await page.goto(`/ko/books/${plannedBookId}`, { waitUntil: "networkidle" });
  await expect(page.getByTestId("book-detail-action-start")).toBeVisible();
  await expect(page.getByTestId("book-detail-action-pause")).toHaveCount(0);
  await page.getByTestId("book-detail-action-start").click();
  await expect(page.getByTestId("book-detail-updated")).toBeVisible();
  await expect(page.getByTestId("book-detail-live")).toHaveAttribute("data-book-status", "reading");

  await setFixture(context, "book-detail-paused");
  await page.goto(`/ko/books/${pausedBookId}`, { waitUntil: "networkidle" });
  await expect(page.getByTestId("book-detail-action-resume")).toBeVisible();
  await page.getByTestId("book-detail-action-resume").click();
  await expect(page.getByTestId("book-detail-updated")).toBeVisible();
  await expect(page.getByTestId("book-detail-live")).toHaveAttribute("data-book-status", "reading");
  await expect(page.getByTestId("book-detail-attempt")).toContainText("2");
});

test("foreign, deleted and invalid-transition detail requests fail closed", async ({ context, page }) => {
  await setFixture(context, "book-detail-foreign");
  await page.goto(`/en/books/${readingBookId}`, { waitUntil: "networkidle" });
  await expect(page.locator('[data-route-state="not-found-or-forbidden"]')).toBeVisible();
  await expect(page.locator("body")).not.toContainText("The Reading Atlas");

  await setFixture(context, "book-detail-deleted");
  await page.goto(`/en/books/${readingBookId}`, { waitUntil: "networkidle" });
  await expect(page.locator('[data-route-state="not-found-or-forbidden"]')).toBeVisible();
  await expect(page.locator("body")).not.toContainText("The Reading Atlas");

  await setFixture(context, "book-detail-invalid-transition");
  await page.goto(`/en/books/${readingBookId}`, { waitUntil: "networkidle" });
  const invalidTransition = await page.request.post("/api/consumer/book-detail", {
    data: { action: "resume", locale: "en", bookId: readingBookId },
  });
  expect(invalidTransition.status()).toBe(400);
  expect((await invalidTransition.json()).error.code).toBe("validation_error");
  await expect(page.getByTestId("book-detail-action-resume")).toHaveCount(0);
});
