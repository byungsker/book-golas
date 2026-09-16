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

async function openAccount(context: BrowserContext, page: Page, fixture: string, locale = "en") {
  await setFixture(context, fixture);
  await page.goto(`/${locale}/account`, { waitUntil: "networkidle" });
}

async function capture(page: Page, name: string) {
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDirectory, name), fullPage: true });
}

test("profile avatar theme and language round trip", async ({ context, page }) => {
  await openAccount(context, page, "account-settings-happy");
  await expect(page.getByTestId("account-settings")).toHaveAttribute("data-account-state", "ready");
  await expect(page.locator("#account-profile-nickname")).toHaveValue("Reader");

  await page.locator("#account-profile-nickname").fill("Updated Reader");
  await page.getByTestId("account-profile-save").click();
  await expect(page.getByTestId("account-settings-saved")).toBeVisible();
  await expect.poll(async () => page.evaluate(async () => (await fetch("/api/consumer/account")).json())).toMatchObject({ profile: { nickname: "Updated Reader" } });

  await page.getByTestId("account-avatar-input").setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: Buffer.from("avatar") });
  await page.getByTestId("account-avatar-save").click();
  await expect(page.getByTestId("account-avatar-saved")).toBeVisible();
  await expect(page.getByTestId("account-avatar-preview").locator("img")).toBeVisible();

  await page.getByTestId("account-theme-light").click();
  await expect(page.locator("html")).toHaveAttribute("data-blab-theme", "light");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("bookgolas.theme"))).toBe("light");

  await page.getByTestId("account-language-ko").click();
  await expect(page.getByTestId("account-language-dialog")).toBeVisible();
  await page.getByTestId("account-language-confirm").click();
  await expect(page).toHaveURL(/\/ko\/account$/);
  await expect(page.getByTestId("account-settings")).toHaveAttribute("data-account-state", "ready");
  await capture(page, "task-31-bookgolas-web-app-parity.png");
});

test("subscription entry remains disabled on Web", async ({ context, page }) => {
  await openAccount(context, page, "account-settings-subscription-disabled");
  await expect(page.getByTestId("account-subscription-status")).toHaveAttribute("data-subscription-state", "disabled");
  await expect(page.getByTestId("account-settings")).toHaveAttribute("data-subscription-enabled", "false");
  await page.getByTestId("account-subscription-link").click();
  await expect(page).toHaveURL(/\/en\/subscription$/);
  await expect(page.getByTestId("subscription-disabled")).toHaveAttribute("data-subscription-enabled", "false");
  await expect(page.getByTestId("subscription-status")).toContainText("Free account");
  await expect(page.locator("body")).not.toContainText(/purchase|restore|upgrade|customer center/i);
});

test("foreign profile update and avatar failure preserve ownership", async ({ context, page }) => {
  await openAccount(context, page, "account-settings-foreign");
  await page.locator("#account-profile-nickname").fill("Other user");
  await page.getByTestId("account-profile-save").click();
  await expect(page.getByTestId("account-settings")).toHaveAttribute("data-account-state", "error");

  await openAccount(context, page, "account-settings-avatar-failure");
  await page.getByTestId("account-avatar-input").setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: Buffer.from("avatar") });
  await page.getByTestId("account-avatar-save").click();
  await expect(page.getByTestId("account-avatar-error")).toBeVisible();
  await expect.poll(async () => page.evaluate(async () => (await fetch("/api/consumer/account")).json())).toMatchObject({ profile: { avatarUrl: null } });
});

test("password validation and provider failure keep the password local", async ({ context, page }) => {
  await openAccount(context, page, "account-settings-happy");
  await page.getByTestId("account-password-open").click();
  await page.getByTestId("account-password-save").click();
  await expect(page.getByTestId("account-password-error")).toContainText("current password");
  await page.locator("#account-current-password").fill("current");
  await page.locator("#account-new-password").fill("short");
  await page.locator("#account-confirm-password").fill("short");
  await page.getByTestId("account-password-save").click();
  await expect(page.getByTestId("account-password-error")).toContainText("6");
  await page.locator("#account-new-password").fill("long-password");
  await page.locator("#account-confirm-password").fill("different-password");
  await page.getByTestId("account-password-save").click();
  await expect(page.getByTestId("account-password-error")).toContainText("match");

  await openAccount(context, page, "account-settings-password-failure");
  await page.getByTestId("account-password-open").click();
  await page.locator("#account-current-password").fill("current");
  await page.locator("#account-new-password").fill("long-password");
  await page.locator("#account-confirm-password").fill("long-password");
  await page.getByTestId("account-password-save").click();
  await expect(page.getByTestId("account-password-error")).toBeVisible();
});

test("loading empty error unauthorized consent quota and offline account states", async ({ context, page }) => {
  const cases = [
    { fixture: "account-settings-empty", state: "empty" },
    { fixture: "account-settings-unauthorized", state: "unauthorized" },
    { fixture: "account-settings-consent", state: "consent" },
    { fixture: "account-settings-quota", state: "quota" },
    { fixture: "account-settings-offline", state: "offline" },
    { fixture: "account-settings-error", state: "error" },
    { fixture: "account-settings-network", state: "error" },
  ] as const;
  for (const item of cases) {
    await openAccount(context, page, item.fixture);
    await expect(page.getByTestId("account-settings")).toHaveAttribute("data-account-state", item.state);
  }
});
