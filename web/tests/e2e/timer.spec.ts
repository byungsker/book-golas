import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const happyBookId = "00000000-0000-4000-8000-000000004361";
const minimumBookId = "00000000-0000-4000-8000-000000004362";
const duplicateBookId = "00000000-0000-4000-8000-000000004363";
const logoutBookId = "00000000-0000-4000-8000-000000004364";
const maximumBookId = "00000000-0000-4000-8000-000000004365";
const timerStorageKey = "bookgolas.reading-timer.v1";
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

async function finishRequest(page: Page, bookId: string, idempotencyKey: string, durationSeconds: number) {
  return page.request.post("/api/consumer/timer", {
    data: {
      action: "finish",
      locale: "en",
      bookId,
      startedAt: "2026-09-16T00:00:00.000Z",
      endedAt: "2026-09-16T00:20:00.000Z",
      durationSeconds,
      idempotencyKey,
    },
  });
}

test("timer starts, pauses, resumes, stops and survives refresh", async ({ context, page }) => {
  await setFixture(context, "timer-happy");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto(`/en/books/${happyBookId}`, { waitUntil: "networkidle" });

  const open = page.getByTestId("reading-timer-open");
  await expect(open).toBeEnabled();
  await open.click();
  await page.getByTestId("timer-start").click();
  await expect(page.getByTestId("consumer-timer-mount")).toHaveAttribute("data-timer-status", "running");

  await page.getByTestId("timer-pause").click();
  await expect(page.getByTestId("consumer-timer-mount")).toHaveAttribute("data-timer-status", "paused");
  await page.evaluate(({ key, bookId }) => {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "null");
    window.localStorage.setItem(key, JSON.stringify({
      ...value,
      bookId,
      accumulatedMilliseconds: 31_000,
      segmentStartedAt: null,
      status: "paused",
    }));
  }, { key: timerStorageKey, bookId: happyBookId });

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("consumer-timer-mount")).toHaveAttribute("data-timer-status", "paused");
  await page.getByTestId("timer-resume").click();
  await expect(page.getByTestId("consumer-timer-mount")).toHaveAttribute("data-timer-status", "running");
  await page.getByTestId("timer-stop").click();

  await expect(page.getByTestId("timer-idle")).toContainText("Reading time saved");
  await expect(page.getByTestId("book-detail-total-reading-time")).toContainText("01:00:31");
  await capture(page, "task-22-bookgolas-web-app-parity.png");
});

test("stop caps sessions over eight hours", async ({ context, page }) => {
  await setFixture(context, "timer-over-max");
  await page.goto(`/en/books/${maximumBookId}`, { waitUntil: "networkidle" });
  const response = await finishRequest(page, maximumBookId, "00000000-0000-4000-8000-000000005381", 86_400);
  const body = await response.json();

  expect(response.status()).toBe(200);
  expect(body.reason).toBe("max-duration");
  expect(body.session.durationSeconds).toBe(28_800);
});

test("minimum sessions are discarded", async ({ context, page }) => {
  await setFixture(context, "timer-minimum");
  await page.goto(`/en/books/${minimumBookId}`, { waitUntil: "networkidle" });
  const response = await finishRequest(page, minimumBookId, "00000000-0000-4000-8000-000000005382", 29);
  const body = await response.json();

  expect(response.status()).toBe(200);
  expect(body.kind).toBe("discarded");
  expect(body.session).toBeNull();
  expect(body.reason).toBe("minimum");
});

test("duplicate stop is harmless", async ({ context, page }) => {
  await setFixture(context, "timer-duplicate");
  await page.goto(`/en/books/${duplicateBookId}`, { waitUntil: "networkidle" });
  const idempotencyKey = "00000000-0000-4000-8000-000000005383";
  const first = await finishRequest(page, duplicateBookId, idempotencyKey, 120);
  const second = await finishRequest(page, duplicateBookId, idempotencyKey, 120);
  const firstBody = await first.json();
  const secondBody = await second.json();

  expect(first.status()).toBe(200);
  expect(second.status()).toBe(200);
  expect(firstBody.duplicate).toBe(false);
  expect(secondBody.duplicate).toBe(true);
  expect(secondBody.session.id).toBe(firstBody.session.id);
});

test("logout clears browser timer state", async ({ context, page }) => {
  await setFixture(context, "timer-logout");
  await page.goto(`/en/books/${logoutBookId}`, { waitUntil: "networkidle" });
  await page.evaluate(({ key, bookId }) => {
    window.localStorage.setItem(key, JSON.stringify({
      bookId,
      bookTitle: "The Reading Atlas",
      bookImageUrl: null,
      sessionId: "00000000-0000-4000-8000-000000005384",
      sessionStartedAt: "2026-09-16T00:00:00.000Z",
      segmentStartedAt: "2026-09-16T00:00:00.000Z",
      accumulatedMilliseconds: 0,
      status: "running",
    }));
    window.dispatchEvent(new Event("bookgolas:logout"));
  }, { key: timerStorageKey, bookId: logoutBookId });

  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), timerStorageKey)).toBeNull();
  await expect(page.getByTestId("consumer-timer-mount")).toHaveAttribute("data-timer-status", "idle");
  await expect(page.getByTestId("timer-idle")).toBeVisible();
});
