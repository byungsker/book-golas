import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const bookId = "00000000-0000-4000-8000-000000004331";
const evidenceDirectory = path.resolve(process.cwd(), "../.omo/evidence/bookgolas-web-app-parity");
const evidencePath = path.join(evidenceDirectory, "task-23-bookgolas-web-parity.png");

async function setFixture(context: BrowserContext, fixture: string) {
  await context.addCookies([
    { name: "bookgolas-route-fixture", value: fixture, domain: "127.0.0.1", path: "/" },
    { name: "bookgolas-route-fixture", value: fixture, domain: "localhost", path: "/" },
  ]);
}

async function openDetail(page: Page, fixture: string) {
  await setFixture(page.context(), fixture);
  await page.goto(`/en/books/${bookId}`);
  await expect(page.getByTestId("notes-highlights-panel")).toBeVisible();
}

test("create, edit and delete notes, highlights and memorable pages", async ({ page }) => {
  await openDetail(page, "notes-highlights-happy");
  const panel = page.getByTestId("notes-highlights-panel");

  await panel.getByTestId("notes-highlights-create-note").click();
  await page.getByTestId("notes-highlights-page").fill("18");
  await page.getByTestId("notes-highlights-text").fill("A note saved from the browser.");
  await page.getByTestId("notes-highlights-save").click();
  await expect(panel.locator('[data-record-type="note"]')).toContainText("A note saved from the browser.");

  const note = panel.locator('[data-record-type="note"]').first();
  await note.getByTestId(/notes-highlights-edit-/).click();
  await page.getByTestId("notes-highlights-text").fill("The edited browser note.");
  await page.getByTestId("notes-highlights-save").click();
  await expect(panel.locator('[data-record-type="note"]')).toContainText("The edited browser note.");

  await panel.getByTestId("notes-highlights-create-highlight").click();
  await page.getByTestId("notes-highlights-page").fill("42");
  await page.getByTestId("notes-highlights-text").fill("A normalized highlight.");
  await page.getByTestId("notes-highlights-save").click();
  await expect(panel.locator('[data-record-type="highlight"]')).toBeVisible();

  await panel.getByTestId("notes-highlights-create-memorable-page").click();
  await page.getByTestId("notes-highlights-page").fill("88");
  await page.getByTestId("notes-highlights-caption").fill("A page worth revisiting.");
  await page.getByTestId("notes-highlights-save").click();
  await expect(panel.locator('[data-record-type="memorable_page"]')).toBeVisible();

  await panel.locator('[data-record-type="note"]').first().getByTestId(/notes-highlights-delete-/).click();
  await expect(page.getByTestId("notes-highlights-delete-confirm")).toBeVisible();
  await page.getByTestId("notes-highlights-delete-confirm").click();
  await expect(panel.locator('[data-record-type="note"]')).toHaveCount(0);

  fs.mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: evidencePath, fullPage: true });
});

test("invalid page and invalid rectangle values are rejected", async ({ page }) => {
  await openDetail(page, "notes-highlights-invalid");
  const panel = page.getByTestId("notes-highlights-panel");

  await panel.getByTestId("notes-highlights-create-highlight").click();
  await page.getByTestId("notes-highlights-page").fill("999");
  await page.getByTestId("notes-highlights-save").click();
  await expect(page.getByTestId("notes-highlights-validation-error")).toBeVisible();
  await expect(panel.locator('[data-record-type="highlight"]')).toHaveCount(0);

  await page.getByTestId("notes-highlights-page").fill("10");
  await page.getByTestId("notes-highlights-rect-x").fill("0.8");
  await page.getByTestId("notes-highlights-rect-width").fill("0.4");
  await page.getByTestId("notes-highlights-save").click();
  await expect(page.getByTestId("notes-highlights-validation-error")).toContainText("rectangle");
});

test("index-failure keeps saved record visible and retry is idempotent", async ({ page }) => {
  await openDetail(page, "notes-highlights-index-failure");
  const panel = page.getByTestId("notes-highlights-panel");

  await panel.getByTestId("notes-highlights-create-note").click();
  await page.getByTestId("notes-highlights-page").fill("22");
  await page.getByTestId("notes-highlights-text").fill("Saved even when indexing fails.");
  await page.getByTestId("notes-highlights-consent").check();
  await page.getByTestId("notes-highlights-save").click();

  const record = panel.locator('[data-record-type="note"]').first();
  await expect(record).toContainText("Saved even when indexing fails.");
  await expect(record.getByTestId(/notes-highlights-index-status-/)).toContainText("Index failed");
  await record.getByTestId(/notes-highlights-retry-/).click();
  await expect(record).toBeVisible();
  await record.getByTestId(/notes-highlights-retry-/).click();
  await expect(panel.locator('[data-record-type="note"]')).toHaveCount(1);
  await expect(record.getByTestId(/notes-highlights-index-status-/)).toContainText("Index failed");
});

test("foreign record requests fail closed", async ({ page, request }) => {
  await openDetail(page, "notes-highlights-foreign");
  await expect(page.getByTestId("notes-highlights-panel")).toHaveAttribute("data-state", "not_found");

  const response = await request.post(`/api/consumer/notes-highlights`, {
    data: {
      action: "delete",
      locale: "en",
      bookId,
      recordId: "00000000-0000-4000-8000-000000004399",
      idempotencyKey: "00000000-0000-4000-8000-000000000999",
    },
    headers: { Cookie: "bookgolas-route-fixture=notes-highlights-foreign" },
  });
  expect(response.status()).toBe(404);
});
