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

test("grant and withdraw provider-specific consent state", async ({ context, page }) => {
  await openAccount(context, page, "ai-consent-happy");

  const settings = page.getByTestId("ai-consent-settings");
  await expect(settings).toBeVisible();
  await expect(settings).toHaveAttribute("data-ai-consent-policy-version", "2");
  await expect(page.getByTestId("ai-consent-provider-google_cloud_vision")).toBeVisible();
  await expect(page.getByTestId("ai-consent-provider-open_ai")).toHaveAttribute("data-ai-consent-state", "not_allowed");
  await expect(page.getByTestId("ai-consent-blocked-open_ai")).toBeVisible();
  await expect(page.getByTestId("ai-consent-details-open_ai")).toContainText("OpenAI OpCo, LLC");
  await expect(page.locator("body")).not.toContainText(/upgrade|purchase|subscribe/i);

  await page.getByTestId("ai-consent-toggle-open_ai").click();
  await expect(page.getByTestId("ai-consent-saved")).toContainText("Provider consent saved");
  await expect(page.getByTestId("ai-consent-provider-open_ai")).toHaveAttribute("data-ai-consent-state", "allowed");
  await expect(page.getByTestId("ai-consent-provider-open_ai")).toHaveAttribute("data-ai-can-send", "true");
  await expect(page.getByTestId("ai-consent-policy-open_ai")).toHaveText("2");
  await expect(page.getByTestId("ai-consent-receipt-open_ai")).not.toHaveText("Not recorded");

  await page.getByTestId("ai-consent-toggle-open_ai").click();
  await expect(page.getByTestId("ai-consent-saved")).toContainText("withdrawn");
  await expect(page.getByTestId("ai-consent-provider-open_ai")).toHaveAttribute("data-ai-consent-state", "not_allowed");
  await expect(page.getByTestId("ai-consent-provider-open_ai")).toHaveAttribute("data-ai-can-send", "false");
  await expect(page.getByTestId("ai-consent-blocked-open_ai")).toBeVisible();
  await capture(page, "task-28-bookgolas-web-app-parity.png");
});

test("unknown consent state stays blocked and unavailable state is visible", async ({ context, page }) => {
  await openAccount(context, page, "ai-consent-unknown", "ko");
  await expect(page.getByTestId("ai-consent-provider-open_ai")).toHaveAttribute("data-ai-consent-state", "unknown");
  await expect(page.getByTestId("ai-consent-provider-open_ai")).toHaveAttribute("data-ai-can-send", "false");
  await expect(page.getByTestId("ai-consent-blocked-open_ai")).toBeVisible();
  await page.getByTestId("ai-consent-toggle-open_ai").click();
  await expect(page.getByTestId("ai-consent-provider-open_ai")).toHaveAttribute("data-ai-consent-state", "unknown");
  await expect(page.getByTestId("ai-consent-provider-open_ai")).toHaveAttribute("data-ai-can-send", "false");

  await openAccount(context, page, "ai-consent-status-unavailable");
  await expect(page.getByTestId("ai-consent-provider-open_ai")).toHaveAttribute("data-ai-consent-state", "unavailable");
  await expect(page.getByTestId("ai-consent-provider-open_ai")).toHaveAttribute("data-ai-can-send", "false");
});

test("quota budget provider and other operational error states", async ({ context, page }) => {
  const cases = [
    { fixture: "ai-consent-consent", state: "consent_required" },
    { fixture: "ai-consent-input-too-large", state: "input_too_large" },
    { fixture: "ai-consent-insufficient-data", state: "insufficient_data" },
    { fixture: "ai-consent-daily-rate-limit", state: "rate_limit_exceeded" },
    { fixture: "ai-consent-quota", state: "quota_exceeded" },
    { fixture: "ai-consent-concurrency", state: "concurrency_exceeded" },
    { fixture: "ai-consent-budget", state: "budget_exceeded" },
    { fixture: "ai-consent-hard-cap", state: "hard_cap_exceeded" },
    { fixture: "ai-consent-timeout", state: "provider_timeout" },
    { fixture: "ai-consent-provider", state: "provider_error" },
    { fixture: "ai-consent-foreign", state: "consent_required" },
    { fixture: "ai-consent-configuration", state: "configuration_error" },
    { fixture: "ai-consent-offline", state: "offline" },
    { fixture: "ai-consent-server-error", state: "provider_error" },
  ] as const;

  for (const { fixture, state } of cases) {
    await openAccount(context, page, fixture);
    await page.getByTestId("ai-consent-toggle-open_ai").click();
    await expect(page.locator(`[data-ai-operational-state="${state}"]`)).toBeVisible();
    await expect(page.getByTestId("ai-consent-provider-open_ai")).toHaveAttribute("data-ai-can-send", "false");
  }

  await openAccount(context, page, "ai-consent-unauthorized");
  await expect(page.getByTestId("ai-consent-error")).toHaveAttribute("data-ai-consent-state", "unauthorized");
});
