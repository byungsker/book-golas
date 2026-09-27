import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const forwardBookId = "00000000-0000-4000-8000-000000004341";
const completeBookId = "00000000-0000-4000-8000-000000004342";
const retryBookId = "00000000-0000-4000-8000-000000004343";
const staleBookId = "00000000-0000-4000-8000-000000004344";
const duplicateBookId = "00000000-0000-4000-8000-000000004345";
const serverErrorBookId = "00000000-0000-4000-8000-000000004346";
const goalsBookId = "00000000-0000-4000-8000-000000004347";
const offlineBookId = "00000000-0000-4000-8000-000000004348";
const evidenceDirectory = path.resolve(process.env.BOOKGOLAS_EVIDENCE_DIR ?? path.resolve(process.cwd(), "../.omo/evidence/bookgolas-web-completion"));

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

test("page-update: progress moves forward and keeps history", async ({ context, page }) => {
  await setFixture(context, "progress-forward");
  await page.goto(`/en/reading/${forwardBookId}`, { waitUntil: "networkidle" });

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
  await page.goto(`/en/reading/${completeBookId}`, { waitUntil: "networkidle" });

  await expect(page.getByTestId("progress-current-page")).toContainText("239 / 240");
  await page.getByTestId("progress-page-input").fill("240");
  await page.getByTestId("progress-submit").click();

  await expect(page.getByTestId("progress-completed")).toBeVisible();
  await expect(page.getByTestId("progress-status")).toContainText("Finished");
  await expect(page.getByTestId("progress-live")).toHaveAttribute("data-progress-status", "completed");
  await capture(page, "task-21-bookgolas-web-app-parity.png");
});

test("progress renders retry attempt messaging", async ({ context, page }) => {
  await setFixture(context, "progress-retry");
  await page.goto(`/ko/reading/${retryBookId}`, { waitUntil: "networkidle" });

  await expect(page.getByTestId("progress-status")).toContainText("잠시 멈춤");
  await expect(page.getByTestId("progress-attempt-message")).toContainText("2");
});

test("stale progress shows conflict and refetch", async ({ context, page }) => {
  await setFixture(context, "progress-stale");
  await page.goto(`/en/reading/${staleBookId}`, { waitUntil: "networkidle" });

  await page.getByTestId("progress-page-input").fill("100");
  await page.getByTestId("progress-submit").click();

  await expect(page.getByTestId("progress-error")).toContainText("changed elsewhere");
  await expect(page.getByTestId("progress-refetch")).toBeVisible();
  await expect(page.getByTestId("progress-saved")).toHaveCount(0);
});

test("duplicate submits preserve one history event", async ({ context, page }) => {
  await setFixture(context, "progress-duplicate");
  await page.goto(`/en/reading/${duplicateBookId}`, { waitUntil: "networkidle" });

  const payload = {
    locale: "en",
    bookId: duplicateBookId,
    currentPage: 100,
    expectedCurrentPage: 84,
    idempotencyKey: "00000000-0000-4000-8000-000000005346",
    readingTime: 900,
  };
  const revision = String(payload.expectedCurrentPage);
  const headers = {
    "If-Match": `"${revision}"`,
    "X-Bookgolas-Action-Key": `${payload.bookId}:progress:${revision}:${payload.idempotencyKey}`,
  };
  const first = await page.request.post("/api/consumer/progress", { data: payload, headers });
  const second = await page.request.post("/api/consumer/progress", { data: payload, headers });
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
  await page.goto(`/en/reading/${serverErrorBookId}`, { waitUntil: "networkidle" });

  await page.getByTestId("progress-page-input").fill("100");
  await page.getByTestId("progress-submit").click();

  await expect(page.getByTestId("progress-error")).toContainText("history could not be recorded");
  await expect(page.getByTestId("progress-saved")).toHaveCount(0);
  await expect(page.getByTestId("progress-current-page")).toContainText("84 / 240");
});

test("progress page bounds reject a value above the total page count", async ({ context, page }) => {
  await setFixture(context, "progress-invalid");
  await page.goto(`/en/reading/${forwardBookId}`, { waitUntil: "networkidle" });

  await page.getByTestId("progress-page-input").fill("241");
  await page.getByTestId("progress-submit").click();

  await expect(page.getByTestId("progress-error")).toContainText("total page count");
  await expect(page.getByTestId("progress-saved")).toHaveCount(0);
});

test("today goal, daily target confirmation and target date expose independent actions", async ({ context, page }) => {
  await setFixture(context, "progress-forward");
  await page.goto(`/en/reading/${goalsBookId}`, { waitUntil: "networkidle" });

  await page.getByTestId("today-goal-open").click();
  await expect(page.getByTestId("today-goal")).toHaveAttribute("data-overlay-state", "ready");
  await capture(page, "task-12-today-goal.png");

  await page.getByTestId("today-goal-settings").click();
  await expect(page.getByTestId("daily-target")).toBeVisible();
  await page.getByTestId("daily-target-input").fill("20");
  await capture(page, "task-12-daily-target.png");
  await page.getByTestId("daily-target-save").click();
  await expect(page.getByTestId("daily-target-confirm")).toBeVisible();
  await capture(page, "task-12-daily-target-confirm.png");
  await page.getByTestId("daily-target-confirm-save").click();
  await expect(page.getByTestId("reading-goals")).toHaveAttribute("data-goal-state", "saved");
  await expect(page.getByTestId("today-goal-summary")).toContainText("20");

  await page.getByTestId("update-target-date-open").click();
  await expect(page.getByTestId("update-target-date")).toBeVisible();
  await page.getByTestId("target-date-input").fill("2026-10-15");
  await capture(page, "task-12-update-target-date.png");
  await page.getByTestId("target-date-save").click();
  await expect(page.getByTestId("reading-goals")).toHaveAttribute("data-goal-state", "saved");
});

test("schedule change previews and confirms an owner-scoped daily target", async ({ context, page }) => {
  const scheduleBookId = "00000000-0000-4000-8000-000000004349";
  await setFixture(context, "progress-forward");
  await page.goto(`/en/reading/${scheduleBookId}`, { waitUntil: "networkidle" });

  await page.getByTestId("schedule-change-open").click();
  await expect(page.getByTestId("schedule-change")).toBeVisible();
  await page.getByTestId("schedule-change-daily-target").fill("24");
  await page.getByTestId("schedule-change-preview-open").click();
  await expect(page.getByTestId("schedule-change-preview-summary")).toHaveAttribute("data-schedule-preview-pages", "24");
  await expect(page.getByTestId("schedule-change-preview-summary")).toHaveAttribute("data-schedule-preview-date", /T00:00:00.000Z$/);
  await capture(page, "task-16-schedule-change-preview.png");

  const responsePromise = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/consumer/progress"));
  const requestPromise = page.waitForRequest((request) => request.method() === "POST" && request.url().endsWith("/api/consumer/progress"));
  await page.getByTestId("schedule-change-confirm").click();
  const request = await requestPromise;
  const response = await responsePromise;
  expect(request.postDataJSON()).toMatchObject({ action: "update_schedule", bookId: scheduleBookId, dailyTargetPages: 24 });
  expect(await response.json()).toMatchObject({ kind: "schedule_updated", book: { id: scheduleBookId, dailyTargetPages: 24 } });
  await expect(page.getByTestId("schedule-change-saved")).toBeVisible();
  await expect(page.getByTestId("schedule-change-preview")).toHaveCount(0);
  await expect(page.getByTestId("today-goal-summary")).toContainText("24");
  await capture(page, "task-16-schedule-change-confirmed.png");
});

test("schedule change cancel makes no mutation and a stale update remains visibly unconfirmed", async ({ context, page }) => {
  await setFixture(context, "progress-forward");
  await page.goto(`/en/reading/${goalsBookId}`, { waitUntil: "networkidle" });
  let scheduleRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/consumer/progress")) scheduleRequests += 1;
  });
  await page.getByTestId("schedule-change-open").click();
  await page.getByTestId("schedule-change-daily-target").fill("24");
  await page.getByTestId("schedule-change-cancel").click();
  await expect(page.getByTestId("schedule-change")).toHaveCount(0);
  expect(scheduleRequests).toBe(0);

  await setFixture(context, "progress-stale");
  await page.goto(`/en/reading/${goalsBookId}`, { waitUntil: "networkidle" });
  await page.getByTestId("schedule-change-open").click();
  await page.getByTestId("schedule-change-daily-target").fill("24");
  await page.getByTestId("schedule-change-preview-open").click();
  await page.getByTestId("schedule-change-confirm").click();
  await expect(page.getByTestId("reading-goals")).toHaveAttribute("data-goal-state", "conflict");
  await expect(page.getByTestId("goal-mutation-state")).toContainText("changed elsewhere");
  await expect(page.getByTestId("schedule-change-preview")).toBeVisible();
  await capture(page, "task-16-schedule-change-conflict.png");
});

test("offline progress mutation is visibly rejected and never queued", async ({ context, page }) => {
  await context.addInitScript(() => {
    Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => false });
  });
  await setFixture(context, "progress-forward");
  await page.goto(`/en/reading/${offlineBookId}`, { waitUntil: "networkidle" });
  let mutationRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/consumer/progress")) mutationRequests += 1;
  });
  await context.setOffline(true);
  await page.getByTestId("progress-page-input").fill("100");
  await page.getByTestId("progress-submit").click();
  await expect(page.getByTestId("progress-error")).toContainText("offline");
  await expect(page.getByTestId("progress-retry")).toBeVisible();
  expect(mutationRequests).toBe(0);
  await capture(page, "task-12-progress-offline-rejected.png");
  await context.setOffline(false);
});
