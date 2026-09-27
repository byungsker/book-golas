import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const reviewBookId = "00000000-0000-4000-8000-000000004331";
const evidenceDirectory = path.resolve(
  process.cwd(),
  "../.omo/evidence/bookgolas-web-completion/task-17-artifacts",
);

async function setFixture(context: BrowserContext, value: string) {
  await context.addCookies([
    { name: "bookgolas-route-fixture", value, domain: "127.0.0.1", path: "/" },
    { name: "bookgolas-route-fixture", value, domain: "localhost", path: "/" },
  ]);
}

async function openHome(context: BrowserContext, page: Page) {
  await setFixture(context, "home-book-list");
  await page.goto("/en/home?view=reading", { waitUntil: "networkidle" });
  await expect(page.getByTestId("home-book-list")).toHaveAttribute("data-route-state", "ready");
}

async function capture(page: Page, name: string) {
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDirectory, name), fullPage: true });
}

test("offline boundary is read-only and reconnect exposes conflict retry", async ({ context, page }) => {
  await openHome(context, page);
  await page.evaluate(() => {
    window.addEventListener("bookgolas:online-reconnected", () => {
      const target = window as typeof window & { __bookgolasReconnectCount?: number };
      target.__bookgolasReconnectCount = (target.__bookgolasReconnectCount ?? 0) + 1;
    });
  });
  const failedMutationRequests: string[] = [];
  const completedMutationRequests: string[] = [];
  page.on("requestfailed", (request) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method()) && request.url().includes("/api/consumer/")) failedMutationRequests.push(request.url());
  });
  page.on("requestfinished", (request) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method()) && request.url().includes("/api/consumer/")) completedMutationRequests.push(request.url());
  });

  await context.setOffline(true);
  const networkStatus = page.getByTestId("network-status");
  await expect(networkStatus).toHaveAttribute("data-network-state", "offline");
  await expect(networkStatus).toHaveAttribute("data-mutation-mode", "read-only");
  await expect(networkStatus).toHaveAttribute("data-queue-enabled", "false");

  const offlineMutationResults = await page.evaluate(async () => {
    const attempts = [
      ["progress", "/api/consumer/progress", "POST"],
      ["book-metadata", "/api/consumer/book-detail", "POST"],
      ["book-status", "/api/consumer/book-lifecycle", "POST"],
      ["notes-highlights", "/api/consumer/notes-highlights", "POST"],
      ["review", "/api/consumer/review-share", "POST"],
      ["timer", "/api/consumer/timer", "POST"],
      ["images-ocr", "/api/consumer/images-ocr", "POST"],
      ["ai", "/api/consumer/ai-artifacts", "POST"],
      ["web-push", "/api/consumer/push", "POST"],
      ["account", "/api/consumer/account", "PATCH"],
    ] as const;
    return Promise.all(attempts.map(async ([mutation, url, method]) => {
      try {
        await fetch(url, { method, body: JSON.stringify({ mutation }) });
        return `${mutation}:unexpected-success`;
      } catch {
        return `${mutation}:offline-rejected`;
      }
    }));
  });
  expect(offlineMutationResults).toEqual([
    "progress:offline-rejected",
    "book-metadata:offline-rejected",
    "book-status:offline-rejected",
    "notes-highlights:offline-rejected",
    "review:offline-rejected",
    "timer:offline-rejected",
    "images-ocr:offline-rejected",
    "ai:offline-rejected",
    "web-push:offline-rejected",
    "account:offline-rejected",
  ]);
  expect(failedMutationRequests).toHaveLength(10);
  expect(completedMutationRequests, "no mutation write").toHaveLength(0);
  const hiddenQueueKeys = await page.evaluate(() => Object.keys(window.localStorage).filter((key) => /queue|outbox|pending-mutation|replay/i.test(key)));
  expect(hiddenQueueKeys, "no hidden queue").toEqual([]);
  await capture(page, "task-17-offline-read-only.png");

  await context.setOffline(false);
  await expect(page.getByTestId("network-status")).toHaveAttribute("data-network-state", "reconnected");
  await expect(page.getByTestId("network-status")).toHaveAttribute("data-mutation-mode", "retryable");
  await expect(page.getByTestId("network-status")).toHaveAttribute("data-reconnect-event", "bookgolas:online-reconnected");
  await expect(page.getByTestId("network-status")).toContainText("Retry the interrupted action");
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __bookgolasReconnectCount?: number }).__bookgolasReconnectCount ?? 0)).toBe(1);
  expect(completedMutationRequests, "reconnect does not replay rejected writes").toHaveLength(0);
  await capture(page, "task-17-offline-reconnect.png");
});

test("duplicate offline mutations are rejected with no hidden queue", async ({ context, page }) => {
  await openHome(context, page);
  await context.setOffline(true);
  const networkStatus = page.getByTestId("network-status");
  await expect(networkStatus).toHaveAttribute("data-queue-enabled", "false");
  await expect(networkStatus).toHaveAttribute("data-online-core", "true");
  await expect(networkStatus).toHaveAttribute("data-mutation-mode", "read-only");
});

test("unsupported-mutation keeps image and AI actions online-only", async ({ context, page }) => {
  await openHome(context, page);
  await context.setOffline(true);
  const networkStatus = page.getByTestId("network-status");
  await expect(networkStatus).toHaveAttribute("data-queue-enabled", "false");
  await expect(networkStatus).toHaveAttribute("data-mutation-mode", "read-only");
  await expect(networkStatus).toContainText("Online-only changes are not queued");
});

test("review draft is local-only and reconnect never replays it", async ({ context, page }) => {
  await setFixture(context, "review-share-happy");
  await page.goto(`/en/books/${reviewBookId}/review`, { waitUntil: "networkidle" });
  await expect(page.getByTestId("review-editor")).toBeVisible();
  const finishedWrites: string[] = [];
  page.on("requestfinished", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/consumer/review-share")) finishedWrites.push(request.url());
  });

  await context.setOffline(true);
  await page.getByTestId("review-short-text").fill("This draft stays only on this device while offline.");
  await expect(page.getByTestId("review-local-draft-status")).toBeVisible();
  await expect.poll(() => page.evaluate((bookId) => window.localStorage.getItem(`bookgolas:review-draft:${bookId}`), reviewBookId)).toContain("This draft stays only on this device while offline.");
  await page.getByTestId("review-save").click();
  await expect(page.getByTestId("review-save-error")).toBeVisible();
  expect(finishedWrites, "no mutation write").toHaveLength(0);

  await context.setOffline(false);
  await page.waitForTimeout(250);
  expect(finishedWrites, "review reconnect does not silently replay").toHaveLength(0);
  await expect.poll(() => page.evaluate((bookId) => window.localStorage.getItem(`bookgolas:review-draft:${bookId}`), reviewBookId)).toContain("This draft stays only on this device while offline.");
  await capture(page, "task-17-review-draft-offline.png");
});
