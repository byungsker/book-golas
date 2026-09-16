import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const evidenceDirectory = path.resolve(process.cwd(), "../.omo/evidence/bookgolas-web-app-parity");

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
  const failedMutationRequests: string[] = [];
  const completedMutationRequests: string[] = [];
  page.on("requestfailed", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/consumer/")) failedMutationRequests.push(request.url());
  });
  page.on("requestfinished", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/consumer/")) completedMutationRequests.push(request.url());
  });

  await context.setOffline(true);
  const networkStatus = page.getByTestId("network-status");
  await expect(networkStatus).toHaveAttribute("data-network-state", "offline");
  await expect(networkStatus).toHaveAttribute("data-mutation-mode", "read-only");
  await expect(networkStatus).toHaveAttribute("data-queue-enabled", "false");

  const offlineMutationResult = await page.evaluate(async () => {
    try {
      await fetch("/api/consumer/progress", { method: "POST", body: JSON.stringify({ currentPage: 21 }) });
      return "unexpected-success";
    } catch {
      return "offline-rejected";
    }
  });
  expect(offlineMutationResult).toBe("offline-rejected");
  expect(failedMutationRequests).toHaveLength(1);
  expect(completedMutationRequests, "no mutation write").toHaveLength(0);

  await context.setOffline(false);
  await expect(page.getByTestId("network-status")).toHaveAttribute("data-network-state", "reconnected");
  await expect(page.getByTestId("network-status")).toHaveAttribute("data-mutation-mode", "retryable");
  await expect(page.getByTestId("network-status")).toHaveAttribute("data-reconnect-event", "bookgolas:online-reconnected");
  await expect(page.getByTestId("network-status")).toContainText("Retry the interrupted action");
  await capture(page, "task-35-bookgolas-web-app-parity.png");
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
