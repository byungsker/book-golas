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

test("search and manual-isbn happy path keeps native search and recommendation entry", async ({ context, page }) => {
  await setFixture(context, "book-discovery-results");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/en/books/new", { waitUntil: "networkidle" });

  await expect(page.getByTestId("book-discovery-page")).toHaveAttribute("data-route-state", "idle");
  await expect(page.getByTestId("book-discovery-recommendations")).toBeVisible();
  await expect(page.getByTestId("book-recommendation")).toHaveCount(2);

  await page.locator("#book-discovery-search").fill("reading");
  await expect(page.getByTestId("book-discovery-result")).toHaveCount(2);
  await expect(page.getByText("The Reading Atlas", { exact: true }).first()).toBeVisible();

  await page.locator("#book-discovery-isbn").fill("978-0-306-40615-7");
  await page.getByRole("button", { name: "Search ISBN", exact: true }).click();
  await expect(page.getByTestId("book-discovery-selected")).toBeVisible();
  await expect(page.getByTestId("book-discovery-selected")).toContainText("9780306406157");

  await page.getByTestId("book-recommendation").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Start with this book", exact: true }).click();
  await expect(page.getByTestId("book-discovery-selected")).toBeVisible();

  await capture(page, "task-18-bookgolas-web-app-parity.png");
  await page.goto("/ko/books/new", { waitUntil: "networkidle" });
  await expect(page.getByText("새로운 독서를 시작하세요", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "ISBN 검색", exact: true })).toBeVisible();
});

test("latest search cancels a stale provider response", async ({ context, page }) => {
  await setFixture(context, "book-discovery-cancellation");
  await page.goto("/en/books/new", { waitUntil: "networkidle" });
  await page.locator("#book-discovery-search").fill("slow");
  await page.waitForRequest((request) => request.url().endsWith("/api/consumer/book-discovery") && request.postDataJSON()?.query === "slow");
  await page.locator("#book-discovery-search").fill("latest");
  await expect(page.getByTestId("book-discovery-result")).toHaveCount(1);
  await expect(page.getByTestId("book-discovery-result")).toContainText("The Quiet Shelf");
  await page.waitForTimeout(900);
  await expect(page.getByTestId("book-discovery-result")).toContainText("The Quiet Shelf");
});

test("unsupported invalid upstream states preserve scanner and manual fallbacks", async ({ context, page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "BarcodeDetector", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
  });
  await setFixture(context, "book-discovery-results");
  await page.goto("/en/books/new", { waitUntil: "networkidle" });

  await page.locator("#book-discovery-isbn").fill("123");
  await page.getByRole("button", { name: "Search ISBN", exact: true }).click();
  await expect(page.getByText("Enter a valid 13-digit ISBN-13 beginning with 978 or 979.", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Scan ISBN", exact: true }).click();
  await expect(page.getByTestId("book-discovery-camera-fallback")).toBeVisible();
  await expect(page.locator("#book-discovery-file-modal")).toHaveAttribute("accept", "image/*");
  await expect(page.locator("#book-discovery-isbn")).toBeVisible();
  await page.getByRole("button", { name: "Close scanner", exact: true }).click();

  await setFixture(context, "book-discovery-upstream");
  await page.locator("#book-discovery-search").fill("provider failure");
  await expect(page.getByText("Book search is temporarily unavailable", { exact: true })).toBeVisible();
});
