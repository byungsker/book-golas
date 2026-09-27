import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const readingBookId = "00000000-0000-4000-8000-000000004331";
const plannedBookId = "00000000-0000-4000-8000-000000004332";
const pausedBookId = "00000000-0000-4000-8000-000000004333";
const evidenceDirectory = path.resolve(process.cwd(), "../.omo/evidence/bookgolas-web-completion/task-11-browser");
const task14EvidenceDirectory = path.resolve(process.cwd(), "../.omo/evidence/bookgolas-web-completion/task-14-browser");

async function setFixture(context: BrowserContext, value: string) {
  await context.addCookies([
    { name: "bookgolas-route-fixture", value, domain: "127.0.0.1", path: "/" },
    { name: "bookgolas-route-fixture", value, domain: "localhost", path: "/" },
  ]);
}

async function capture(page: Page, name: string) {
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(evidenceDirectory, name), fullPage: true });
}

async function captureTask14(page: Page, name: string) {
  fs.mkdirSync(task14EvidenceDirectory, { recursive: true });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(task14EvidenceDirectory, name), fullPage: true });
}

test("detail exposes every lifecycle overlay with independent actions", async ({ context, page }) => {
  await setFixture(context, "book-detail-reading");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto(`/en/books/${readingBookId}`, { waitUntil: "networkidle" });

  await expect(page.getByTestId("book-detail-metadata")).toBeVisible();
  await page.getByTestId("book-detail-full-title-open").click();
  await expect(page.getByTestId("full-title")).toContainText("The Reading Atlas");
  await capture(page, "task-11-book-detail-full-title.png");
  await page.keyboard.press("Escape");

  await page.getByTestId("book-detail-info-open").click();
  await expect(page.getByTestId("book-info")).toContainText("9780306406157");
  await capture(page, "task-11-book-detail-book-info.png");
  await page.keyboard.press("Escape");

  await page.getByTestId("book-detail-management-open").click();
  await expect(page.getByTestId("reading-management")).toBeVisible();
  await capture(page, "task-11-book-detail-reading-management.png");
  await page.getByTestId("reading-management-batch-delete").click();
  await expect(page.getByTestId("batch-delete-confirmation")).toBeVisible();
  await capture(page, "task-11-book-detail-batch-delete-confirmation.png");
  await page.getByTestId("batch-delete-confirm").click();
  await expect(page.getByTestId("book-detail-live")).toHaveAttribute("data-active-tab", "memorable");
  await page.getByTestId("book-detail-tab-detail").click();

  await page.getByTestId("book-detail-action-pause").click();
  await expect(page.getByTestId("pause-reading-confirmation")).toBeVisible();
  await capture(page, "task-11-book-detail-pause-confirmation.png");
  await page.getByTestId("pause-reading-cancel").click();
  await expect(page.getByTestId("book-detail-live")).toHaveAttribute("data-book-status", "reading");

  await page.getByTestId("book-detail-action-complete").click();
  await expect(page.getByTestId("book-detail-updated")).toBeVisible();
  await expect(page.getByTestId("book-completion")).toBeVisible();
  await capture(page, "task-11-book-detail-completion.png");
  await page.getByTestId("book-completion-review").click();
  await expect(page.getByTestId("book-review-prompt")).toBeVisible();
  await expect(page.getByTestId("book-review-prompt-write")).toHaveAttribute("href", `/en/books/${readingBookId}/review`);
  await capture(page, "task-11-book-detail-review-prompt.png");
  await page.getByTestId("book-review-prompt-dismiss").click();

  await page.getByTestId("book-detail-action-delete").click();
  await expect(page.getByTestId("book-detail-delete-dialog")).toBeVisible();
  await capture(page, "task-11-book-detail-delete-confirmation.png");
  await page.getByTestId("book-detail-delete-cancel").click();
  await expect(page.getByTestId("book-detail-live")).toHaveAttribute("data-book-status", "completed");
  await page.getByTestId("book-detail-action-delete").click();
  await page.getByTestId("book-detail-delete-confirm").click();
  await expect(page.getByTestId("book-detail-deleted")).toBeVisible();
  await capture(page, "task-11-book-detail-deleted.png");
});

test("planned editing, planned start and paused resume remain owner-scoped", async ({ context, page }) => {
  await setFixture(context, "book-detail-planned");
  await page.goto(`/ko/books/${plannedBookId}`, { waitUntil: "networkidle" });
  await page.getByTestId("book-detail-planned-edit-open").click();
  await expect(page.getByTestId("edit-planned-book")).toBeVisible();
  await page.getByTestId("edit-planned-book-date").fill("2026-09-21");
  await page.getByTestId("edit-planned-book-priority").selectOption("1");
  await capture(page, "task-11-book-detail-edit-planned-book.png");
  await page.getByTestId("edit-planned-book-save").click();
  await expect(page.getByTestId("edit-planned-book")).toBeHidden();
  await page.getByTestId("book-detail-action-start").click();
  await expect(page.getByTestId("book-detail-live")).toHaveAttribute("data-book-status", "reading");

  await setFixture(context, "book-detail-paused");
  const pausedPage = await context.newPage();
  await pausedPage.goto(`/ko/books/${pausedBookId}`, { waitUntil: "domcontentloaded" });
  await pausedPage.getByTestId("book-detail-action-resume").click();
  await expect(pausedPage.getByTestId("book-detail-live")).toHaveAttribute("data-book-status", "reading");
  await expect(pausedPage.getByTestId("book-detail-attempt")).toContainText("2");
  await pausedPage.close();
});

test("external review link editor saves, cancels and deletes without changing review text", async ({ context, page }) => {
  await setFixture(context, "review-share-happy");
  await page.goto(`/en/books/${readingBookId}`, { waitUntil: "networkidle" });
  const originalReview = await page.getByTestId("book-detail-review").textContent();

  await page.getByTestId("review-link-editor-open").click();
  await expect(page.getByTestId("review-link-editor")).toBeVisible();
  await page.getByTestId("review-link-editor-input").fill("https://example.com/cancelled-review");
  await page.getByTestId("review-link-editor-cancel").click();
  await expect(page.getByTestId("book-detail-review-link")).not.toHaveAttribute("href", "https://example.com/cancelled-review");

  await page.getByTestId("review-link-editor-open").click();
  await page.getByTestId("review-link-editor-input").fill("https://example.com/saved-review");
  await captureTask14(page, "review-link-editor.png");
  await page.getByTestId("review-link-editor-save").click();
  await expect(page.getByTestId("review-link-editor")).toBeHidden();
  await expect(page.getByTestId("book-detail-review-link")).toHaveAttribute("href", "https://example.com/saved-review");
  await expect(page.getByTestId("book-detail-review")).toContainText(originalReview?.includes("A practical") ? "A practical" : "Review");

  await page.getByTestId("review-link-editor-open").click();
  await page.getByTestId("review-link-editor-delete").click();
  await expect(page.getByTestId("book-detail-review-link")).toHaveCount(0);
});

test("Korean detail and confirmation states reflow at the mobile breakpoint", async ({ context, page }) => {
  await setFixture(context, "book-detail-reading");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto(`/ko/books/${readingBookId}`, { waitUntil: "networkidle" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.getByTestId("book-detail-management-open").click();
  await expect(page.getByTestId("reading-management")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await capture(page, "task-11-book-detail-mobile-ko-management.png");
  await page.getByTestId("reading-management-cancel").click();
  await page.getByTestId("book-detail-tab-history").click();
  await expect(page.getByTestId("book-detail-history-panel")).toBeVisible();
  await capture(page, "task-11-book-detail-mobile-ko-history.png");
});

test("foreign, deleted and invalid-transition detail requests fail closed", async ({ context, page }) => {
  await setFixture(context, "book-detail-foreign");
  await page.goto(`/en/books/${readingBookId}`, { waitUntil: "networkidle" });
  await expect(page.locator('[data-route-state="not-found-or-forbidden"]')).toBeVisible();
  await expect(page.locator("body")).not.toContainText("The Reading Atlas");

  const foreignWrite = await page.request.post("/api/consumer/book-detail", {
    headers: { "If-Match": '"2026-09-16T00:00:00.000Z"', "X-Bookgolas-Action-Key": `${readingBookId}:pause:2026-09-16T00:00:00.000Z` },
    data: { action: "pause", locale: "en", bookId: readingBookId },
  });
  expect(foreignWrite.status()).toBe(404);
  expect((await foreignWrite.json()).error.code).toBe("not_found");

  await setFixture(context, "book-detail-deleted");
  await page.goto(`/en/books/${readingBookId}`, { waitUntil: "networkidle" });
  await expect(page.locator('[data-route-state="not-found-or-forbidden"]')).toBeVisible();

  await setFixture(context, "book-detail-invalid-transition");
  await page.goto(`/en/books/${readingBookId}`, { waitUntil: "networkidle" });
  const invalidTransition = await page.request.post("/api/consumer/book-detail", {
    headers: { "If-Match": '"2026-09-16T00:00:00.000Z"', "X-Bookgolas-Action-Key": `${readingBookId}:resume:2026-09-16T00:00:00.000Z` },
    data: { action: "resume", locale: "en", bookId: readingBookId },
  });
  expect(invalidTransition.status()).toBe(400);
  expect((await invalidTransition.json()).error.code).toBe("validation_error");
});
