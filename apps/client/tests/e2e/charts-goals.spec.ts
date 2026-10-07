import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const evidenceDirectory = path.resolve(process.cwd(), "../.omo/evidence/bookgolas-web-completion/task-15-artifacts");

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
  const currentParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());
  const currentYear = Number(currentParts.find((part) => part.type === "year")?.value);
  const currentMonth = Number(currentParts.find((part) => part.type === "month")?.value);
  const monthlyStart = currentYear === 2026 ? currentMonth : 12;
  const previousPeriod = new Date(Date.UTC(2026, monthlyStart - 2, 1, 12));
  const previousYear = previousPeriod.getUTCFullYear();
  const previousMonth = previousPeriod.getUTCMonth() + 1;

  await setFixture(context, "charts-goals-happy");
  await page.goto("/en/stats?view=annual&year=2026&status=all", { waitUntil: "networkidle" });

  await expect(page.getByTestId("stats-title")).toHaveText("Reading statistics");
  await expect(page.getByTestId("stats-timezone")).toContainText("Asia/Seoul");
  await expect(page.getByTestId("stats-metric-pages-read")).toContainText("60p");
  await expect(page.getByTestId("stats-metric-reading-time")).toContainText("1h");
  await expect(page.getByTestId("stats-metric-completion")).toContainText("33.3%");

  await page.getByTestId("stats-tab-analysis").click();
  await expect(page).toHaveURL(/section=analysis/);
  await expect(page.getByTestId("stats-genre-card")).toContainText("Literature");
  await page.getByTestId("stats-tab-activity").click();
  await expect(page).toHaveURL(/section=activity/);
  await expect(page.getByTestId("stats-heatmap-2026-09-01")).toHaveAttribute("title", /20p/);
  await page.getByTestId("stats-period-monthly").click();
  await expect(page).toHaveURL(/view=monthly/);
  await expect(page).toHaveURL(/section=activity/);
  await page.getByTestId("stats-period-previous").click();
  await expect(page).toHaveURL(new RegExp(`year=${previousYear}.*month=${previousMonth}`));
  await expect(page).toHaveURL(/section=activity/);
  await capture(page, "stats-positive.png");
});

test("annual goal updates", async ({ context, page }) => {
  await setFixture(context, "charts-goals-goal");
  await page.goto("/en/stats?view=annual&year=2026&status=all", { waitUntil: "networkidle" });

  await page.getByTestId("stats-goal-open").click();
  await expect(page.getByTestId("stats-goal-dialog")).toBeVisible();
  await capture(page, "reading-goal.png");
  await page.getByTestId("stats-goal-input").fill("36");
  await page.getByTestId("stats-goal-save").click();
  await expect(page.getByTestId("stats-goal-saved")).toBeVisible();
  await expect(page.getByTestId("stats-goal-completed")).toContainText("1 / 36");
});

test("custom date range applies, clears and cancels without losing section", async ({ context, page }) => {
  await setFixture(context, "charts-goals-happy");
  await page.goto("/en/stats?view=annual&year=2026&status=all&section=analysis", { waitUntil: "networkidle" });

  await page.getByTestId("stats-period-custom").click();
  await expect(page.getByTestId("stats-custom-range-dialog")).toBeVisible();
  await capture(page, "date-range-picker.png");
  await page.getByRole("button", { name: "Cancel", exact: true }).last().click();
  await expect(page).toHaveURL(/view=annual/);
  await expect(page).toHaveURL(/section=analysis/);

  await page.getByTestId("stats-period-custom").click();
  await page.getByTestId("stats-custom-start").fill("2026-09-01");
  await page.getByTestId("stats-custom-end").fill("2026-09-15");
  await page.getByTestId("stats-custom-apply").click();
  await expect(page).toHaveURL(/view=custom/);
  await expect(page).toHaveURL(/customStart=2026-09-01/);
  await expect(page).toHaveURL(/customEnd=2026-09-15/);
  await expect(page).toHaveURL(/section=analysis/);
  await page.getByTestId("stats-custom-clear").click();
  await expect(page).toHaveURL(/view=annual/);
  await expect(page).toHaveURL(/section=analysis/);
});

test("AI insight generates a bounded result", async ({ context, page }) => {
  await setFixture(context, "charts-goals-happy");
  await page.goto("/en/stats?view=annual&year=2026&status=all", { waitUntil: "networkidle" });
  await page.getByTestId("stats-ai-insight-generate").click();
  await expect(page.getByTestId("stats-ai-insight-success")).toContainText("A steady reading rhythm");
  await expect(page.getByTestId("stats-ai-insight-success").locator("section")).toHaveCount(1);
  await capture(page, "stats-ai-insight-success.png");
});

for (const scenario of [
  { fixture: "charts-goals-ai-quota", code: "quota_exceeded", image: "stats-ai-quota.png", text: "operational AI quota" },
  { fixture: "charts-goals-ai-provider", code: "provider_error", image: "stats-ai-provider.png", text: "temporarily unavailable" },
]) {
  test(`AI insight ${scenario.code} is safe and retryable`, async ({ context, page }) => {
    await setFixture(context, scenario.fixture);
    await page.goto("/en/stats?view=annual&year=2026&status=all", { waitUntil: "networkidle" });
    await page.getByTestId("stats-ai-insight-generate").click();
    const error = page.getByTestId(`stats-ai-insight-error-${scenario.code}`);
    await expect(error).toContainText(scenario.text);
    await expect(error).toContainText("does not require a purchase or subscription");
    await expect(page.getByTestId("stats-ai-insight-retry")).toBeVisible();
    await capture(page, scenario.image);
    await page.getByTestId("stats-ai-insight-retry").click();
    await expect(error).toBeVisible();
  });
}

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
  await expect(page.getByTestId("stats-invalid-range")).toContainText("up to 366 days");
  await capture(page, "stats-invalid-range.png");
});

test("statistics stale snapshot", async ({ context, page }) => {
  await setFixture(context, "charts-goals-stale");
  await page.goto("/en/stats?view=annual&year=2026&status=all", { waitUntil: "networkidle" });
  await expect(page.getByTestId("stats-stale")).toBeVisible();
  await expect(page.getByTestId("stats-page")).toHaveAttribute("data-route-state", "stale");
  await capture(page, "stats-stale.png");
});

for (const fixture of ["charts-goals-foreign", "charts-goals-deleted"]) {
  test(`${fixture} records never affect aggregates`, async ({ context, page }) => {
    await setFixture(context, fixture);
    await page.goto("/en/stats?view=annual&year=2026&status=all", { waitUntil: "networkidle" });
    await expect(page.getByTestId("stats-metric-pages-read")).toContainText("60p");
    await expect(page.getByTestId("stats-metric-completion")).toContainText("33.3%");
  });
}
