import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const evidenceDirectory = path.resolve(process.cwd(), "../.omo/evidence/bookgolas-web-app-parity");
const payload = { year: 2026, email: "reader@example.com", format: "csv", includeImages: true };

async function setFixture(context: BrowserContext, value: string) {
  await context.addCookies([
    { name: "bookgolas-route-fixture", value, domain: "127.0.0.1", path: "/" },
    { name: "bookgolas-route-fixture", value, domain: "localhost", path: "/" },
  ]);
}

async function openAccount(context: BrowserContext, page: Page, fixture: string, locale = "en") {
  await setFixture(context, fixture);
  await page.goto(`/${locale}/account`, { waitUntil: "networkidle" });
}

async function submitExport(page: Page) {
  await page.locator("#export-email").fill(payload.email);
  await page.getByTestId("export-submit").click();
}

async function capture(page: Page) {
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDirectory, "task-33-bookgolas-web-app-parity.png"), fullPage: true });
}

test("export success keeps selected year, format and localized account action", async ({ context, page }) => {
  await openAccount(context, page, "export-success");
  await expect(page.getByTestId("reading-data-export")).toHaveAttribute("data-export-locale", "en");
  await page.getByTestId("export-year").selectOption("2025");
  await page.getByTestId("export-format").selectOption("json");
  await page.getByTestId("export-include-images").uncheck();
  const requestPromise = page.waitForRequest((request) => request.url().endsWith("/api/consumer/export"));
  await page.locator("#export-email").fill(payload.email);
  await page.getByTestId("export-submit").click();
  const exportRequest = await requestPromise;
  expect(exportRequest.postDataJSON()).toMatchObject({ year: 2025, email: payload.email, format: "json", includeImages: false });
  await expect(page.getByTestId("reading-data-export")).toHaveAttribute("data-export-state", "ready");
  await expect(page.getByTestId("export-success")).toContainText("2025");

  await openAccount(context, page, "export-success", "ko");
  await expect(page.getByTestId("reading-data-export")).toHaveAttribute("data-export-locale", "ko");
  await submitExport(page);
  await expect(page.getByTestId("export-success")).toContainText("2026");
  await capture(page);
});

test("export loading and empty states remain observable", async ({ context, page }) => {
  await openAccount(context, page, "export-success");
  await page.route("**/api/consumer/export", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.continue();
  });
  await submitExport(page);
  await expect(page.getByTestId("reading-data-export")).toHaveAttribute("data-export-state", "loading");
  await expect(page.getByTestId("export-loading")).toBeVisible();
  await expect(page.getByTestId("reading-data-export")).toHaveAttribute("data-export-state", "ready");

  await openAccount(context, page, "export-empty");
  await submitExport(page);
  await expect(page.getByTestId("reading-data-export")).toHaveAttribute("data-export-state", "empty");
  await expect(page.getByTestId("export-empty")).toBeVisible();
});

test("export unauthorized consent quota and offline states keep safe feedback", async ({ context, page }) => {
  const cases = [
    ["export-unauthorized", "unauthorized"],
    ["export-consent", "consent"],
    ["export-quota", "quota"],
    ["export-offline", "offline"],
  ] as const;
  for (const [fixture, state] of cases) {
    await openAccount(context, page, fixture);
    await submitExport(page);
    await expect(page.getByTestId("reading-data-export")).toHaveAttribute("data-export-state", state);
    await expect(page.getByTestId("export-error-state")).toBeVisible();
  }
});

test("mismatch invalid-year and caller identity are rejected", async ({ context, page }) => {
  await openAccount(context, page, "export-mismatch");
  await page.locator("#export-email").fill("other@example.com");
  await page.getByTestId("export-submit").click();
  await expect(page.getByTestId("reading-data-export")).toHaveAttribute("data-export-state", "error");

  await setFixture(context, "export-invalid-year");
  const invalidYear = await page.request.post("/api/consumer/export", { data: { ...payload, year: 1999 } });
  expect(invalidYear.status()).toBe(400);
  expect((await invalidYear.json()).error.code).toBe("validation_error");
  await setFixture(context, "export-invalid-email");
  const invalidEmail = await page.request.post("/api/consumer/export", { data: { ...payload, email: "invalid" } });
  expect(invalidEmail.status()).toBe(400);
  expect((await invalidEmail.json()).error.code).toBe("validation_error");

  await setFixture(context, "export-user-mismatch");
  const callerIdentity = await page.request.post("/api/consumer/export", { data: { ...payload, user_id: "foreign-user" } });
  expect(callerIdentity.status()).toBe(400);
  expect((await callerIdentity.json()).error.code).toBe("validation_error");
  expect(await page.content()).not.toContain("foreign-user");
});

test("delivery and download failures expose a retryable error", async ({ context, page }) => {
  for (const fixture of ["export-delivery", "export-download"] as const) {
    await openAccount(context, page, fixture);
    await submitExport(page);
    await expect(page.getByTestId("reading-data-export")).toHaveAttribute("data-export-state", "error");
    await expect(page.getByTestId("export-error-state")).toHaveAttribute("data-export-error", "error");
    await expect(page.getByTestId("export-retry")).toBeVisible();
  }
});
