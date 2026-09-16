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

async function capture(page: Page, name: string) {
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDirectory, name), fullPage: true });
}

test("happy path keeps native tabs, title/author search, cursor pagination and record detail entry", async ({ context, page }) => {
  await setFixture(context, "library-book-list");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/en/library", { waitUntil: "networkidle" });

  await expect(page.getByTestId("library-page")).toHaveAttribute("data-route-state", "ready");
  await expect(page.getByTestId("library-tabs").getByRole("tab")).toHaveCount(3);
  await expect(page.getByTestId("library-tab-reading")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("library-book")).toHaveCount(2);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const loadMore = page.getByTestId("library-load-more");
    if (await loadMore.count() === 0) break;
    await loadMore.click();
    await expect(page.getByTestId("library-content")).toHaveAttribute("aria-busy", "false");
  }
  await expect(page.getByTestId("library-book")).toHaveCount(5);
  const ids = await page.getByTestId("library-book").evaluateAll((items) => items.map((item) => item.getAttribute("data-book-id")));
  expect(new Set(ids).size).toBe(ids.length);

  await page.getByTestId("library-tab-review").click();
  await expect(page).toHaveURL(/\/en\/library\?tab=review$/);
  await expect(page.getByTestId("library-book")).toHaveCount(2);
  await page.getByTestId("library-search").fill("Finished");
  await expect(page.getByTestId("library-book")).toHaveCount(1);
  await expect(page.getByTestId("library-book")).toHaveAttribute("data-book-title", "Finished Signals");

  await page.getByTestId("library-tab-records").click();
  await expect(page.getByTestId("library-record-filters")).toBeVisible();
  await page.getByTestId("library-record-filter-note").click();
  await expect(page.getByTestId("library-record")).toHaveCount(1);
  await page.getByTestId("library-record").click();
  await expect(page.getByTestId("library-record-detail")).toBeVisible();
  await expect(page.getByTestId("library-record-detail")).toContainText("The Reading Atlas");
  await expect(page.getByTestId("library-record-detail").getByRole("link")).toHaveAttribute("href", /\/en\/books\//);
  await capture(page, "task-17-bookgolas-web-app-parity.png");

  await page.goto("/ko/library", { waitUntil: "networkidle" });
  await expect(page.getByTestId("library-tab-reading")).toContainText("읽는 중");
  await expect(page.getByTestId("library-search")).toHaveAttribute("placeholder", "제목 또는 저자 검색");
});

test("loading state precedes the resolved library response", async ({ context, page }) => {
  await setFixture(context, "library-pending");
  await page.goto("/en/library", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("library-loading")).toBeVisible();
  await expect(page.getByTestId("library-page")).toHaveAttribute("data-route-state", "ready");
});

test("cancellation keeps the latest debounced title search and discards the slow response", async ({ context, page }) => {
  await setFixture(context, "library-cancellation");
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/consumer/library")) requests.push(request.url());
  });
  await page.goto("/en/library", { waitUntil: "networkidle" });
  await page.getByTestId("library-search").fill("slow");
  await expect.poll(() => requests.some((url) => new URL(url).searchParams.get("query") === "slow")).toBe(true);
  await page.getByTestId("library-search").fill("Atlas");
  await expect(page.getByTestId("library-book").first()).toHaveAttribute("data-book-title", "The Reading Atlas");
  await expect.poll(() => requests.some((url) => new URL(url).searchParams.get("query") === "Atlas")).toBe(true);
  await expect(page.locator("body")).not.toContainText("Request failed");
});

test("empty, foreign and unavailable boundaries stay private and retryable", async ({ context, page }) => {
  await setFixture(context, "library-empty");
  await page.goto("/en/library", { waitUntil: "networkidle" });
  await expect(page.getByTestId("library-empty")).toBeVisible();
  await expect(page.getByText("No books match your search", { exact: true })).toBeVisible();

  await setFixture(context, "library-foreign");
  await page.goto("/en/library", { waitUntil: "networkidle" });
  await page.getByTestId("library-search").fill("Foreign private title");
  await expect(page.getByTestId("library-empty")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Foreign private title");
  await expect(page.locator("body")).not.toContainText("User A recall history");
  const tampered = await page.request.get("/api/consumer/library?tab=reading&user_id=foreign-user-id");
  expect(tampered.status()).toBe(400);
  expect(await tampered.text()).not.toContain("Foreign private title");

  await setFixture(context, "library-network");
  await page.goto("/en/library", { waitUntil: "networkidle" });
  await expect(page.getByTestId("library-error")).toBeVisible();
  await expect(page.getByTestId("library-retry")).toBeVisible();

  await setFixture(context, "library-unauthorized");
  await page.goto("/en/library", { waitUntil: "networkidle" });
  await expect(page.getByTestId("library-unauthorized")).toBeVisible();

  await setFixture(context, "library-book-list");
  await page.goto("/en/library", { waitUntil: "networkidle" });
  await context.setOffline(true);
  await expect(page.getByTestId("network-status")).toHaveAttribute("data-network-state", "offline");
  await context.setOffline(false);
});

test("Recall entry searches records, keeps history separate from book results and exposes quota/consent states", async ({ context, page }) => {
  await setFixture(context, "library-recall");
  await page.goto("/en/library", { waitUntil: "networkidle" });
  await page.getByTestId("library-recall-open").click();
  await expect(page.getByTestId("library-recall-panel")).toBeVisible();
  await expect(page.getByTestId("library-recall-history-item")).toHaveCount(1);
  await page.getByTestId("library-recall-input").fill("attention");
  await page.getByTestId("library-recall-submit").click();
  await expect(page.getByTestId("library-recall-answer")).toBeVisible();
  await expect(page.getByTestId("library-recall-source-group")).toBeVisible();
  await expect(page.getByTestId("library-books")).toHaveCount(0);
  await capture(page, "task-17-SURFACE-recall.png");

  await setFixture(context, "library-quota");
  await page.goto("/en/library?view=records&mode=recall", { waitUntil: "networkidle" });
  await expect(page.getByTestId("library-recall-panel")).toBeVisible();
  await page.getByTestId("library-recall-input").fill("attention");
  await page.getByTestId("library-recall-submit").click();
  await expect(page.getByTestId("library-quota")).toBeVisible();

  await setFixture(context, "library-consent");
  await page.goto("/en/library?view=records&mode=recall", { waitUntil: "networkidle" });
  await page.getByTestId("library-recall-input").fill("attention");
  await page.getByTestId("library-recall-submit").click();
  await expect(page.getByTestId("library-consent")).toBeVisible();
});
