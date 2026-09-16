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

async function openAccount(context: BrowserContext, page: Page, fixture: string) {
  await setFixture(context, fixture);
  await page.goto("/en/account", { waitUntil: "networkidle" });
  await expect(page.getByTestId("account-settings")).toHaveAttribute("data-account-state", "ready");
}

async function fillDeletionForm(page: Page) {
  await page.locator("#account-delete-password").fill("current-password");
  await page.locator("#account-delete-confirmation").fill("DELETE");
}

test("cancel leaves the account untouched and repeated confirmation is safe", async ({ context, page }) => {
  await openAccount(context, page, "account-deletion-cancel-or-retry");
  await page.evaluate(() => {
    localStorage.setItem("bookgolas.reading-timer.v1", "fixture-timer");
    localStorage.setItem("bookgolas.theme", "dark");
    sessionStorage.setItem("bookgolas.product-cache", "fixture-cache");
  });

  let deletionRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/consumer/account/deletion")) deletionRequests += 1;
  });

  await page.getByTestId("account-delete-open").click();
  await expect(page.getByTestId("account-delete-dialog")).toBeVisible();
  await page.getByTestId("account-delete-cancel").click();
  await expect(page.getByTestId("account-delete-dialog")).toBeHidden();
  expect(deletionRequests).toBe(0);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("bookgolas.reading-timer.v1"))).toBe("fixture-timer");

  await page.getByTestId("account-delete-open").click();
  await fillDeletionForm(page);
  await page.getByTestId("account-delete-confirm").click();
  await expect(page).toHaveURL(/\/en\/account-deleted$/);
  await expect(page.getByTestId("account-deleted-page")).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("bookgolas.reading-timer.v1"))).toBeNull();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("bookgolas.theme"))).toBeNull();
  await expect.poll(() => page.evaluate(() => sessionStorage.length)).toBe(0);

  await page.goto("/en/account", { waitUntil: "networkidle" });
  await page.getByTestId("account-delete-open").click();
  await fillDeletionForm(page);
  await page.getByTestId("account-delete-confirm").click();
  await expect(page).toHaveURL(/\/en\/account-deleted$/);
});

test("destructive failures stay visible and do not clear local state", async ({ context, page }) => {
  await openAccount(context, page, "account-deletion-unauthorized");
  await page.evaluate(() => localStorage.setItem("bookgolas.reading-timer.v1", "fixture-timer"));
  await page.getByTestId("account-delete-open").click();
  await fillDeletionForm(page);
  await page.getByTestId("account-delete-confirm").click();
  await expect(page.getByTestId("account-delete-error")).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("bookgolas.reading-timer.v1"))).toBe("fixture-timer");
});

test("public completion route is available in both localized surfaces", async ({ page }) => {
  for (const locale of ["en", "ko"]) {
    await page.goto(`/${locale}/account-deleted`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("account-deleted-page")).toBeVisible();
    await expect(page.getByTestId("account-deleted-home")).toHaveAttribute("href", `/${locale}`);
    await expect(page.getByTestId("account-deleted-sign-in")).toHaveAttribute("href", `/${locale}/auth/sign-in`);
  }
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDirectory, "task-34-account-deleted-en.png"), fullPage: true });
});
