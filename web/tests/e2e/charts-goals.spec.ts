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

test("reading statistics metrics", async ({ context, page }) => {
  await setFixture(context, "charts-goals-happy");
  await page.goto("/en/stats?view=annual&year=2026&status=all", { waitUntil: "networkidle" });

  await expect(page.getByTestId("stats-title")).toHaveText("Reading statistics");
  await expect(page.getByTestId("stats-timezone")).toContainText("Asia/Seoul");
  await expect(page.getByTestId("stats-metric-pages-read")).toContainText("60p");
  await expect(page.getByTestId("stats-metric-reading-time")).toContainText("1h");
  await expect(page.getByTestId("stats-metric-completion")).toContainText("33.3%");

  await page.getByTestId("stats-tab-analysis").click();
  await expect(page.getByTestId("stats-genre-card")).toContainText("Literature");
  await page.getByTestId("stats-tab-activity").click();
  await expect(page.getByTestId("stats-heatmap-2026-09-01")).toHaveAttribute("title", /20p/);
  await capture(page, "task-27-bookgolas-web-app-parity.png");
});

test("annual goal updates", async ({ context, page }) => {
  await setFixture(context, "charts-goals-goal");
  await page.goto("/en/stats?view=annual&year=2026&status=all", { waitUntil: "networkidle" });

  await page.getByTestId("stats-goal-open").click();
  await expect(page.getByTestId("stats-goal-dialog")).toBeVisible();
  await page.getByTestId("stats-goal-input").fill("36");
  await page.getByTestId("stats-goal-save").click();
  await expect(page.getByTestId("stats-goal-saved")).toBeVisible();
  await expect(page.getByTestId("stats-goal-completed")).toContainText("1 / 36");
});

test("stats share fallback", async ({ context, page }) => {
  await setFixture(context, "charts-goals-happy");
  await page.goto("/en/stats?view=annual&year=2026&status=all", { waitUntil: "networkidle" });
  await expect(page.getByTestId("stats-share-card")).toBeVisible();
  await page.getByTestId("stats-share-button").click();
  await expect(page.getByTestId("stats-share-result")).toBeVisible();
  await expect(page.getByTestId("stats-share-result")).toContainText(/copied|downloaded|cancelled|Share stats/i);
});

test("statistics empty state", async ({ context, page }) => {
  await setFixture(context, "charts-goals-empty");
  await page.goto("/ko/stats?view=annual&year=2026&status=all", { waitUntil: "networkidle" });
  await expect(page.getByTestId("stats-empty")).toBeVisible();
  await expect(page.getByTestId("stats-empty")).toContainText("아직 독서 데이터가 없어요");
});

test("statistics invalid-range", async ({ context, page }) => {
  await setFixture(context, "charts-goals-invalid-range");
  await page.goto("/en/stats?view=annual&year=2026&status=all", { waitUntil: "networkidle" });
  await expect(page.getByTestId("stats-invalid-range")).toBeVisible();
  await expect(page.getByTestId("stats-invalid-range")).toContainText("ordered date range");
});

test("statistics stale snapshot", async ({ context, page }) => {
  await setFixture(context, "charts-goals-stale");
  await page.goto("/en/stats?view=annual&year=2026&status=all", { waitUntil: "networkidle" });
  await expect(page.getByTestId("stats-stale")).toBeVisible();
  await expect(page.getByTestId("stats-page")).toHaveAttribute("data-route-state", "stale");
});
