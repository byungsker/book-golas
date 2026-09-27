import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const evidenceDirectory = path.resolve(
  process.cwd(),
  "../.omo/evidence/bookgolas-web-completion/task-19-artifacts",
);

async function setFixture(context: BrowserContext, value: string) {
  await context.addCookies([
    { name: "bookgolas-route-fixture", value, domain: "127.0.0.1", path: "/" },
    { name: "bookgolas-route-fixture", value, domain: "localhost", path: "/" },
  ]);
}

async function capture(page: Page, name: string, metadata: Record<string, unknown>) {
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDirectory, name), fullPage: true });
  fs.writeFileSync(
    path.join(evidenceDirectory, name.replace(/\.png$/, ".json")),
    `${JSON.stringify({ capturedAt: new Date().toISOString(), browser: "chromium", ...metadata }, null, 2)}\n`,
  );
}

test("search-mode-menu completes both actions and returns focus on Escape", async ({ context, page }) => {
  await setFixture(context, "authenticated-not-found");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/en/home", { waitUntil: "networkidle" });
  const trigger = page.getByTestId("consumer-desktop-navigation").getByRole("button", { name: "Search" });
  await trigger.click();
  const overlay = page.getByTestId("search-mode-menu");
  await expect(overlay).toHaveRole("dialog");
  await expect(overlay).toHaveAccessibleName("What do you want to find?");
  await capture(page, "happy-search-mode-menu.png", {
    viewport: "1440x900",
    locale: "en",
    route: "/en/home",
    fixture: "authenticated-not-found",
    observable: "search-mode-menu opened as a named dialog; the same test verifies Escape dismissal, focus return, and terminal Book search and Recall URLs",
  });
  await page.keyboard.press("Escape");
  await expect(overlay).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await overlay.getByRole("button", { name: /^Book search/ }).click();
  await expect(page).toHaveURL(/\/en\/books\/new\?mode=search$/);
  await page.waitForLoadState("networkidle");
  await page.goto("/en/home", { waitUntil: "networkidle" });
  await trigger.click();
  await overlay.getByRole("button", { name: /^Recall/ }).click();
  await expect(page).toHaveURL(/\/en\/library\?view=records&mode=recall$/);
});

test("context-menu and search-overlay expose keyboard dismissal and terminal state", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/en/ui-primitives", { waitUntil: "networkidle" });
  const contextTrigger = page.getByTestId("context-menu-open");
  await contextTrigger.click();
  await expect(page.getByTestId("context-menu")).toHaveRole("menu");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("context-menu")).toBeHidden();
  await expect(contextTrigger).toBeFocused();
  await contextTrigger.click();
  await page.getByRole("menuitem", { name: "Choose reading action" }).click();
  await expect(page.getByTestId("context-menu-outcome")).toHaveText("Reading action chosen.");

  const searchTrigger = page.getByTestId("search-overlay-open");
  await searchTrigger.click();
  const search = page.getByTestId("search-overlay");
  await expect(search).toHaveAccessibleName("Search records");
  await page.getByTestId("search-overlay-input").fill("focus");
  await expect(page.getByTestId("search-overlay-result")).toHaveText("Searching for focus");
  await page.keyboard.press("Escape");
  await expect(search).toBeHidden();
  await expect(searchTrigger).toBeFocused();
});

test("clear-ai-memory-confirmation cancels and confirms without changing reading records", async ({ context, page }) => {
  await setFixture(context, "charts-goals-happy");
  await page.goto("/en/stats", { waitUntil: "networkidle" });
  await page.getByTestId("stats-ai-insight-generate").click();
  await expect(page.getByTestId("stats-ai-insight-success")).toBeVisible();
  const trigger = page.getByTestId("clear-ai-memory-open");
  await trigger.click();
  const confirmation = page.getByTestId("clear-ai-memory-confirmation");
  await expect(confirmation).toHaveAccessibleName("Clear this AI insight?");
  await page.getByTestId("clear-ai-memory-cancel").click();
  await expect(page.getByTestId("stats-ai-insight-success")).toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByTestId("clear-ai-memory-confirm").click();
  await expect(page.getByTestId("stats-ai-insight-idle")).toBeVisible();
});

test("pro-features stays visibly disabled with no billing action", async ({ context, page }) => {
  await setFixture(context, "authenticated-not-found");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/en/subscription", { waitUntil: "networkidle" });
  const disabled = page.getByTestId("subscription-disabled");
  await expect(disabled).toHaveAttribute("data-parity-overlay", "pro-features");
  await expect(disabled).toHaveAttribute("data-subscription-enabled", "false");
  await expect(disabled.getByRole("button")).toHaveCount(0);
  await expect(page.getByText(/purchase|restore|upgrade/i)).toHaveCount(0);
  await capture(page, "disabled-pro-features.png", {
    viewport: "390x844",
    locale: "en",
    route: "/en/subscription",
    fixture: "authenticated-not-found",
    observable: "pro-features disabled boundary visible; no billing button and no purchase, restore, or upgrade action",
  });
});
