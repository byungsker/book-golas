import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const forwardBookId = "00000000-0000-4000-8000-000000004341";
const completeBookId = "00000000-0000-4000-8000-000000004342";
const retryBookId = "00000000-0000-4000-8000-000000004343";
const staleBookId = "00000000-0000-4000-8000-000000004344";
const duplicateBookId = "00000000-0000-4000-8000-000000004345";
const serverErrorBookId = "00000000-0000-4000-8000-000000004346";
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

test("progress moves forward and keeps history", async ({ context, page }) => {
  await setFixture(context, "progress-forward");
  await page.goto(`/en/books/${forwardBookId}`, { waitUntil: "networkidle" });

  await expect(page.getByTestId("progress-current-page")).toContainText("84 / 240");
  await expect(page.getByTestId("progress-history")).toHaveCount(1);
  await page.getByTestId("progress-page-input").fill("100");
  await page.getByTestId("progress-submit").click();

  await expect(page.getByTestId("progress-saved")).toBeVisible();
  await expect(page.getByTestId("progress-current-page")).toContainText("100 / 240");
  await expect(page.getByTestId("progress-history")).toContainText("84");
});

test("progress completes at total pages", async ({ context, page }) => {
  await setFixture(context, "progress-complete");
  await page.goto(`/en/books/${completeBookId}`, { waitUntil: "networkidle" });

  await expect(page.getByTestId("progress-current-page")).toContainText("239 / 240");
  await page.getByTestId("progress-page-input").fill("240");
  await page.getByTestId("progress-submit").click();

  await expect(page.getByTestId("progress-completed")).toBeVisible();
  await expect(page.getByTestId("progress-status")).toContainText("Finished");
  await expect(page.getByTestId("book-detail-live")).toHaveAttribute("data-book-status", "completed");
  await capture(page, "task-21-bookgolas-web-app-parity.png");
});

test("progress renders retry attempt messaging", async ({ context, page }) => {
  await setFixture(context, "progress-retry");
  await page.goto(`/ko/books/${retryBookId}`, { waitUntil: "networkidle" });

  await expect(page.getByTestId("progress-status")).toContainText("잠시 멈춤");
  await expect(page.getByTestId("progress-attempt-message")).toContainText("2");
  await expect(page.getByTestId("book-detail-attempt")).toContainText("2");
});

test("stale progress shows conflict and refetch", async ({ context, page }) => {
  await setFixture(context, "progress-stale");
  await page.goto(`/en/books/${staleBookId}`, { waitUntil: "networkidle" });

  await page.getByTestId("progress-page-input").fill("100");
  await page.getByTestId("progress-submit").click();

  await expect(page.getByTestId("progress-error")).toContainText("changed elsewhere");
  await expect(page.getByTestId("progress-refetch")).toBeVisible();
  await expect(page.getByTestId("progress-saved")).toHaveCount(0);
});

test("duplicate submits preserve one history event", async ({ context, page }) => {
  await setFixture(context, "progress-duplicate");
  await page.goto(`/en/books/${duplicateBookId}`, { waitUntil: "networkidle" });

  const payload = {
    locale: "en",
    bookId: duplicateBookId,
    currentPage: 100,
    expectedCurrentPage: 84,
    idempotencyKey: "00000000-0000-4000-8000-000000005346",
    readingTime: 900,
  };
  const first = await page.request.post("/api/consumer/progress", { data: payload });
  const second = await page.request.post("/api/consumer/progress", { data: payload });
  const firstBody = await first.json();
  const secondBody = await second.json();

  expect(first.status()).toBe(200);
  expect(second.status()).toBe(200);
  expect(firstBody.duplicate).toBe(false);
  expect(secondBody.duplicate).toBe(true);
  expect(secondBody.history).toHaveLength(firstBody.history.length);
});

test("server-error never presents false success after history failure", async ({ context, page }) => {
  await setFixture(context, "progress-server-error");
  await page.goto(`/en/books/${serverErrorBookId}`, { waitUntil: "networkidle" });

  await page.getByTestId("progress-page-input").fill("100");
  await page.getByTestId("progress-submit").click();

  await expect(page.getByTestId("progress-error")).toContainText("history could not be recorded");
  await expect(page.getByTestId("progress-saved")).toHaveCount(0);
  await expect(page.getByTestId("progress-current-page")).toContainText("84 / 240");
});

test("progress page bounds reject a value above the total page count", async ({ context, page }) => {
  await setFixture(context, "progress-invalid");
  await page.goto(`/en/books/${forwardBookId}`, { waitUntil: "networkidle" });

  await page.getByTestId("progress-page-input").fill("241");
  await page.getByTestId("progress-submit").click();

  await expect(page.getByTestId("progress-error")).toContainText("total page count");
  await expect(page.getByTestId("progress-saved")).toHaveCount(0);
});
