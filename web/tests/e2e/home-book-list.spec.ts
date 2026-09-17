import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const evidenceDirectory = path.resolve(
  process.cwd(),
  "../.omo/evidence/bookgolas-web-app-parity",
);

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

test("happy path renders five native status tabs, cards, progress, target D-day, add entry and keeps soft-deleted rows hidden", async ({ context, page }) => {
  await setFixture(context, "home-book-list");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/en/home?view=all", { waitUntil: "networkidle" });

  await expect(page.getByTestId("home-book-list")).toHaveAttribute("data-route-state", "ready");
  const tabs = page.getByTestId("home-status-tabs");
  await expect(tabs.getByRole("link")).toHaveCount(5);
  await expect(page.getByTestId("home-status-tab-all")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("current-reading-section")).toBeVisible();

  const allBooks = page.getByTestId("home-book-list-view-all");
  for (const status of ["reading", "planned", "completed", "will_retry"]) {
    await expect(allBooks.locator(`[data-book-status="${status}"]`)).toHaveCount(1);
  }
  await expect(page.getByText("Deleted private fixture", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("progressbar").first()).toBeVisible();
  await expect(page.locator('[data-testid="book-dday"]')).toHaveCount(5);
  await expect(page.getByRole("link", { name: "Add a book", exact: true })).toHaveAttribute("href", "/en/books/new");

  await capture(page, "task-16-bookgolas-web-app-parity.png");

  await page.getByTestId("home-status-tab-completed").click();
  await expect(page).toHaveURL(/\/en\/home\?view=completed$/);
  await expect(page.getByTestId("home-book-list-view-completed").locator('[data-book-status="completed"]')).toHaveCount(1);
  await expect(page.getByTestId("home-book-list-view-completed").locator('[data-book-status="reading"]')).toHaveCount(0);

  await page.goto("/ko/home?view=paused", { waitUntil: "networkidle" });
  await expect(page.getByTestId("home-status-tab-paused")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("home-book-list-view-paused").locator('[data-book-status="will_retry"]')).toHaveCount(1);
  await expect(page.getByTestId("home-status-tab-paused")).toHaveText("다시 읽기");
  await expect(page.getByText("삭제된 비공개 fixture", { exact: false })).toHaveCount(0);
});

test("loading skeleton precedes the resolved reading list", async ({ context, page }) => {
  await setFixture(context, "pending");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en/stats", { waitUntil: "networkidle" });
  await page.getByTestId("consumer-desktop-navigation").getByRole("link", { name: "Home" }).click();
  await expect(page.getByTestId("home-book-list-skeleton")).toBeVisible();
  await expect(page.getByTestId("home-book-list")).toBeVisible();
  await expect(page.getByTestId("home-book-list-empty-reading")).toBeVisible();
});

test("empty status surfaces stay distinct and keep the add-entry action", async ({ context, page }) => {
  const cases = [
    ["home-empty-reading", "reading", "Nothing is in progress"],
    ["home-empty-planned", "planned", "No books are planned"],
    ["home-empty-completed", "completed", "No finished books yet"],
    ["home-empty-paused", "paused", "No paused books"],
  ] as const;

  const emptyTitles = new Set<string>();
  for (const [fixture, view, title] of cases) {
    await setFixture(context, fixture);
    await page.goto(`/en/home?view=${view}`, { waitUntil: "networkidle" });
    await expect(page.getByTestId(`home-book-list-empty-${view}`)).toBeVisible();
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await expect(page.getByTestId("home-status-tabs").getByRole("link")).toHaveCount(5);
    await expect(page.getByRole("link", { name: "Add a book", exact: true }).last()).toBeVisible();
    emptyTitles.add(title);
  }
  expect(emptyTitles.size).toBe(4);
});

test("network error offers retry and offline state is announced", async ({ context, page }) => {
  await setFixture(context, "unavailable");
  await page.goto("/en/home", { waitUntil: "networkidle" });
  await expect(page.getByTestId("home-book-list")).toHaveAttribute("data-route-state", "error");
  await expect(page.getByText("The library is temporarily unavailable", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh", exact: true }).first()).toBeVisible();

  await setFixture(context, "home-book-list");
  await page.goto("/en/home?view=reading", { waitUntil: "networkidle" });
  await context.setOffline(true);
  await expect(page.getByTestId("network-status")).toHaveAttribute("data-network-state", "offline");
  await context.setOffline(false);
});
