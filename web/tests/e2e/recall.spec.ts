import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const atlasBookId = "00000000-0000-4000-8000-000000004301";
const quietBookId = "00000000-0000-4000-8000-000000004302";
const photoId = "00000000-0000-4000-8000-000000004323";
const historyId = "00000000-0000-4000-8000-000000004331";
const evidenceDirectory = path.resolve(process.cwd(), "../.omo/evidence/bookgolas-web-app-parity");

async function setFixture(context: BrowserContext, fixture: string) {
  await context.addCookies([
    { name: "bookgolas-route-fixture", value: fixture, domain: "127.0.0.1", path: "/" },
    { name: "bookgolas-route-fixture", value: fixture, domain: "localhost", path: "/" },
  ]);
}

async function capture(page: Page) {
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDirectory, "task-29-bookgolas-web-app-parity.png"), fullPage: true });
}

test("global recall search source expansion copy and history", async ({ context, page }) => {
  await setFixture(context, "recall-happy");
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://127.0.0.1:3000" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/en/library?mode=recall", { waitUntil: "networkidle" });

  const panel = page.getByTestId("library-recall-panel");
  await expect(panel).toHaveAttribute("data-recall-scope", "global");
  await expect(panel.getByTestId("library-recall-history-item")).toHaveCount(2);
  await panel.getByTestId("library-recall-history-delete").first().click();
  await expect(panel.getByTestId("library-recall-history-item")).toHaveCount(1);
  await panel.getByTestId("library-recall-input").fill("attention");
  await panel.getByTestId("library-recall-submit").click();
  await expect(panel.getByTestId("library-recall-answer")).toBeVisible();
  await expect(panel.getByTestId("library-recall-source-group")).toHaveCount(2);
  const firstGroup = panel.getByTestId("library-recall-source-group").first();
  await firstGroup.getByTestId("recall-source-group-toggle").click();
  await expect(firstGroup.getByTestId("recall-source-list")).toBeHidden();
  await firstGroup.getByTestId("recall-source-group-toggle").click();
  await firstGroup.getByTestId("recall-source-card").first().click();
  await expect(page.getByTestId("recall-source-detail")).toBeVisible();
  await page.getByTestId("recall-source-copy").click();
  await expect(page.getByTestId("recall-source-detail")).toContainText("Copied");
  await page.getByTestId("recall-source-detail-close").click();

  await page.getByTestId("library-recall-new-search").click();
  await panel.getByTestId("library-recall-input").fill("practice");
  await panel.getByTestId("library-recall-submit").click();
  await expect(panel.getByTestId("library-recall-answer")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Foreign private title");
  await capture(page);

  const tampered = await page.request.get("/api/consumer/recall?locale=en&user_id=foreign-user-id");
  expect(tampered.status()).toBe(400);
});

test("book recall search source navigation and signed image", async ({ context, page }) => {
  await setFixture(context, "recall-happy");
  await page.goto(`/en/books/${atlasBookId}`, { waitUntil: "networkidle" });
  const panel = page.getByTestId("book-recall-panel");
  await expect(panel).toHaveAttribute("data-recall-scope", "book");
  await panel.getByTestId("book-recall-input").fill("attention");
  await panel.getByTestId("book-recall-submit").click();
  await expect(panel.getByTestId("book-recall-answer")).toBeVisible();
  await expect(panel.getByTestId("recall-source-card")).toHaveCount(2);
  await expect(panel.getByTestId("recall-source-group-book")).toHaveAttribute("href", `/en/books/${atlasBookId}`);

  await setFixture(context, "recall-image");
  await page.goto("/en/library?mode=recall", { waitUntil: "networkidle" });
  await page.getByTestId("library-recall-input").fill("practice");
  await page.getByTestId("library-recall-submit").click();
  await expect(page.getByTestId("library-recall-source-group")).toHaveCount(2);
  const photoCard = page.getByTestId("recall-source-card").filter({ hasText: "The margin" });
  await photoCard.click();
  await expect(page.getByTestId("recall-source-image")).toHaveAttribute("src", /^https:\/\//);
  await expect(page.getByTestId("recall-source-go-to-book")).toHaveAttribute("href", `/en/books/${quietBookId}`);
  await expect(page.getByTestId("recall-source-image")).toHaveAttribute("src", /token=/);
  await page.getByTestId("recall-source-detail-close").click();

  const source = await page.request.get(`/api/consumer/recall/source?locale=en&bookId=${quietBookId}&sourceId=${photoId}`);
  expect(source.status()).toBe(200);
  expect((await source.json()).signedUrl).toMatch(/^https:\/\//);
});

test("consent quota foreign and empty recall states", async ({ context, page }) => {
  await setFixture(context, "recall-consent");
  await page.goto("/en/library?mode=recall", { waitUntil: "networkidle" });
  await page.getByTestId("library-recall-input").fill("attention");
  await page.getByTestId("library-recall-submit").click();
  await expect(page.getByTestId("library-consent")).toBeVisible();

  await setFixture(context, "recall-quota");
  await page.goto("/en/library?mode=recall", { waitUntil: "networkidle" });
  await page.getByTestId("library-recall-input").fill("attention");
  await page.getByTestId("library-recall-submit").click();
  await expect(page.getByTestId("library-quota")).toBeVisible();

  await setFixture(context, "recall-foreign");
  await page.goto("/en/library?mode=recall", { waitUntil: "networkidle" });
  await page.getByTestId("library-recall-input").fill("private");
  await page.getByTestId("library-recall-submit").click();
  await expect(page.getByTestId("library-recall-result")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Foreign private title");
  await expect(page.locator("body")).not.toContainText("User A recall history");

  await setFixture(context, "recall-empty");
  await page.goto("/en/library?mode=recall", { waitUntil: "networkidle" });
  await page.getByTestId("library-recall-input").fill("missing");
  await page.getByTestId("library-recall-submit").click();
  await expect(page.getByTestId("library-recall-empty")).toBeVisible();

  await setFixture(context, "recall-provider");
  await page.goto("/en/library?mode=recall", { waitUntil: "networkidle" });
  await page.getByTestId("library-recall-input").fill("attention");
  await page.getByTestId("library-recall-submit").click();
  await expect(page.getByTestId("library-provider")).toBeVisible();

  await setFixture(context, "recall-offline");
  await page.goto("/en/library?mode=recall", { waitUntil: "networkidle" });
  await page.getByTestId("library-recall-input").fill("attention");
  await page.getByTestId("library-recall-submit").click();
  await expect(page.getByTestId("library-offline")).toBeVisible();

  await setFixture(context, "recall-unauthorized");
  await page.goto("/en/library?mode=recall", { waitUntil: "networkidle" });
  await expect(page.getByTestId("library-unauthorized")).toBeVisible();
});

test("history deletion is idempotent", async ({ context, page }) => {
  await setFixture(context, "recall-happy");
  await page.goto("/en/library?mode=recall", { waitUntil: "networkidle" });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await page.request.post("/api/consumer/recall", { data: { action: "delete_history", locale: "en", historyId, bookId: atlasBookId } });
    expect(response.status()).toBe(200);
    expect((await response.json()).historyId).toBe(historyId);
  }
});
