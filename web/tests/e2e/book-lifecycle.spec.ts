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

test("add and schedule lifecycle saves metadata, status, priority and an edited daily goal", async ({ context, page }) => {
  await setFixture(context, "book-lifecycle-success");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/en/books/new", { waitUntil: "networkidle" });

  await page.locator("#book-discovery-search").fill("reading");
  await expect(page.getByTestId("book-discovery-result")).toHaveCount(2);
  await page.getByTestId("book-discovery-result").first().getByRole("button", { name: "Use this book", exact: true }).click();
  await expect(page.getByTestId("book-lifecycle-form")).toBeVisible();

  await page.getByTestId("book-lifecycle-status-planned").click();
  await expect(page.getByTestId("book-lifecycle-planned-date")).toBeVisible();
  await page.getByTestId("book-lifecycle-priority-1").click();
  await page.getByTestId("book-lifecycle-schedule-edit").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByTestId("book-lifecycle-schedule-dialog-input").fill("20");
  await page.getByTestId("book-lifecycle-schedule-dialog-save").click();
  await expect(page.getByTestId("book-lifecycle-schedule-preview")).toContainText("20");

  await page.getByTestId("book-lifecycle-save").click();
  await expect(page.getByTestId("book-lifecycle-saved")).toBeVisible();
  await expect(page.getByTestId("book-lifecycle-saved")).toContainText("The Reading Atlas");
  await expect(page.getByTestId("book-lifecycle-saved")).toContainText("To read");

  await page.getByTestId("book-lifecycle-edit").click();
  await page.getByTestId("book-lifecycle-status-reading").click();
  await page.getByTestId("book-lifecycle-priority-4").click();
  await page.getByTestId("book-lifecycle-save").click();
  await expect(page.getByTestId("book-lifecycle-saved")).toBeVisible();
  await expect(page.getByTestId("book-lifecycle-saved")).toContainText("Reading");

  await capture(page, "task-19-bookgolas-web-app-parity.png");
  await page.goto("/en/home", { waitUntil: "networkidle" });
  await expect(page.getByTestId(/home-book-card-/).first()).toContainText("The Reading Atlas");
});

test("invalid, duplicate and foreign writes stay bounded and recoverable", async ({ context, page }) => {
  await setFixture(context, "book-lifecycle-success");
  await page.goto("/en/books/new", { waitUntil: "networkidle" });
  await page.locator("#book-discovery-search").fill("reading");
  await page.getByTestId("book-discovery-result").first().getByRole("button", { name: "Use this book", exact: true }).click();

  const startDate = await page.getByTestId("book-lifecycle-start-date").inputValue();
  await page.getByTestId("book-lifecycle-target-date").fill("2020-01-01");
  await page.getByTestId("book-lifecycle-save").click();
  await expect(page.getByTestId("book-lifecycle-error")).toHaveAttribute("data-error-code", "validation_error");

  await page.getByTestId("book-lifecycle-target-date").fill(startDate);
  await setFixture(context, "book-lifecycle-duplicate");
  await page.getByTestId("book-lifecycle-save").click();
  await expect(page.getByTestId("book-lifecycle-error")).toHaveAttribute("data-error-code", "conflict");
  await expect(page.getByTestId("book-lifecycle-retry")).toBeVisible();
  await expect(page.getByTestId("book-lifecycle-save")).toBeEnabled();

  await setFixture(context, "book-lifecycle-foreign");
  const foreignResponse = await page.request.post("/api/consumer/book-lifecycle", {
    data: {
      action: "update",
      locale: "en",
      book: { bookId: "00000000-0000-4000-8000-000000004399", status: "reading" },
    },
  });
  expect(foreignResponse.status()).toBe(404);
  expect((await foreignResponse.json()).error.code).toBe("not_found");
});
