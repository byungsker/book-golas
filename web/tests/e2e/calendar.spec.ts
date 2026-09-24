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

test("calendar month navigation and filters", async ({ context, page }) => {
  await setFixture(context, "calendar-happy");
  await page.goto("/en/calendar?year=2026&month=9&filter=all", { waitUntil: "networkidle" });

  await expect(page.getByTestId("calendar-title")).toHaveText("Reading calendar");
  await expect(page.getByTestId("calendar-timezone")).toContainText("Asia/Seoul");
  await expect(page.getByTestId("calendar-monthly-book-count")).toContainText("4");
  await expect(page.getByTestId("calendar-day-2026-09-01")).toHaveAttribute("data-calendar-has-activity", "true");

  await page.getByTestId("calendar-filter-completed").click();
  await expect(page.getByTestId("calendar-page")).toHaveAttribute("data-calendar-filter", "completed");
  await expect(page.getByTestId("calendar-day-2026-09-09")).toHaveAttribute("data-calendar-has-activity", "true");
  await expect(page.getByTestId("calendar-day-2026-09-02")).toHaveAttribute("data-calendar-has-activity", "false");

  await page.getByTestId("calendar-next-month").click();
  await expect(page).toHaveURL(/month=10/);
  await expect(page.getByTestId("calendar-empty")).toBeVisible();
  await page.getByTestId("calendar-previous-month").click();
  await expect(page).toHaveURL(/month=9/);
  await expect(page.getByTestId("calendar-page")).toHaveAttribute("data-calendar-filter", "completed");
  await page.getByTestId("calendar-filter-all").click();
  await expect(page.getByTestId("calendar-page")).toHaveAttribute("data-calendar-filter", "all");
  await capture(page, "calendar-positive.png");
});

test("calendar day-detail opens owned book", async ({ context, page }) => {
  await setFixture(context, "calendar-happy");
  await page.goto("/en/calendar?year=2026&month=9", { waitUntil: "networkidle" });

  await page.getByTestId("calendar-day-2026-09-02").click();
  await expect(page.getByTestId("calendar-day-detail")).toBeVisible();
  await expect(page.getByTestId("calendar-day-detail")).toContainText("September 2, 2026");
  await expect(page.getByTestId("calendar-day-book-00000000-0000-4000-8000-000000004391")).toContainText("The Reading Atlas");
  await expect(page.getByTestId("calendar-open-book-00000000-0000-4000-8000-000000004391")).toBeVisible();
  await capture(page, "calendar-day-detail.png");
  await page.getByTestId("calendar-day-detail-close").click();
  await expect(page.getByTestId("calendar-day-detail")).toHaveCount(0);
});

test("calendar timezone keeps UTC midnight events on the correct KST day", async ({ context, page }) => {
  await setFixture(context, "calendar-happy");
  await page.goto("/en/calendar?year=2026&month=9", { waitUntil: "networkidle" });

  await expect(page.getByTestId("calendar-day-2026-09-01")).toHaveAttribute("data-calendar-book-count", "1");
  await expect(page.getByTestId("calendar-day-2026-09-02")).toHaveAttribute("data-calendar-book-count", "1");
  await page.getByTestId("calendar-day-2026-09-02").click();
  await expect(page.getByTestId("calendar-events-00000000-0000-4000-8000-000000004391")).toContainText("+12 pages");
  await capture(page, "calendar-timezone.png");
});

test("calendar month picker confirms and cancels without losing filter state", async ({ context, page }) => {
  await setFixture(context, "calendar-happy");
  await page.goto("/en/calendar?year=2026&month=9&filter=completed", { waitUntil: "networkidle" });

  await page.getByTestId("calendar-month-button").click();
  await expect(page.getByTestId("calendar-month-picker")).toBeVisible();
  await capture(page, "calendar-month-picker.png");
  await page.getByTestId("calendar-month-input").fill("2026-08");
  await page.getByTestId("calendar-month-cancel").click();
  await expect(page.getByTestId("calendar-month-picker")).toHaveCount(0);
  await expect(page).toHaveURL(/month=9/);
  await expect(page).toHaveURL(/filter=completed/);

  await page.getByTestId("calendar-month-button").click();
  await expect(page.getByTestId("calendar-month-picker")).toBeVisible();
  await page.getByTestId("calendar-month-input").fill("2026-08");
  await page.getByTestId("calendar-month-confirm").click();
  await expect(page).toHaveURL(/month=8/);
  await expect(page).toHaveURL(/filter=completed/);
});

test("calendar day detail preserves paused and planned statuses", async ({ context, page }) => {
  await setFixture(context, "calendar-happy");
  await page.goto("/en/calendar?year=2026&month=9", { waitUntil: "networkidle" });

  await page.getByTestId("calendar-day-2026-09-11").click();
  await expect(page.locator('[data-calendar-book-status="will_retry"]')).toContainText("Paused");
  await page.getByTestId("calendar-day-detail-close").click();
  await page.getByTestId("calendar-day-2026-09-20").click();
  await expect(page.getByTestId("calendar-planned-marker")).toBeVisible();
  await expect(page.getByTestId("calendar-day-detail")).toContainText("To read");
});

test("calendar empty state", async ({ context, page }) => {
  await setFixture(context, "calendar-empty");
  await page.goto("/ko/calendar?year=2026&month=9", { waitUntil: "networkidle" });
  await expect(page.getByTestId("calendar-empty")).toBeVisible();
  await expect(page.getByTestId("calendar-empty")).toContainText("아직 독서 활동이 없어요");
});

test("calendar network failure", async ({ context, page }) => {
  await setFixture(context, "calendar-network");
  await page.goto("/en/calendar?year=2026&month=9", { waitUntil: "networkidle" });
  await expect(page.getByTestId("calendar-error")).toBeVisible();
  await expect(page.getByTestId("calendar-error")).toHaveAttribute("data-calendar-error-code", "unavailable");
});

test("calendar foreign events stay out of day detail", async ({ context, page }) => {
  await setFixture(context, "calendar-foreign");
  await page.goto("/en/calendar?year=2026&month=9", { waitUntil: "networkidle" });
  await expect(page.getByText("Foreign Private title")).toHaveCount(0);
  await page.getByTestId("calendar-day-2026-09-02").click();
  await expect(page.getByTestId("calendar-day-books")).toContainText("The Reading Atlas");
  await expect(page.getByTestId("calendar-day-books")).not.toContainText("Foreign Private title");
  await capture(page, "calendar-foreign.png");
});

test("calendar deleted books stay out of day detail", async ({ context, page }) => {
  await setFixture(context, "calendar-deleted");
  await page.goto("/en/calendar?year=2026&month=9", { waitUntil: "networkidle" });

  await expect(page.getByTestId("calendar-page")).toHaveAttribute("data-route-state", "ready");
  await expect(page.getByTestId("calendar-monthly-book-count")).toContainText("4");
  await expect(page.getByText("Deleted Private title")).toHaveCount(0);
  await page.getByTestId("calendar-day-2026-09-02").click();
  await expect(page.getByTestId("calendar-day-detail")).toBeVisible();
  await expect(page.getByTestId("calendar-day-books")).toContainText("The Reading Atlas");
  await expect(page.getByTestId("calendar-day-books")).not.toContainText("Deleted Private title");
  await capture(page, "calendar-deleted.png");
});

test("calendar unauthorized state returns to sign in", async ({ context, page }) => {
  await setFixture(context, "calendar-unauthorized");
  await page.goto("/en/calendar?year=2026&month=9", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/en\/auth\/sign-in/);
  await capture(page, "calendar-unauthorized.png");
});
