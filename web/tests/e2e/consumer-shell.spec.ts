import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const evidenceDirectory = path.resolve(
  process.cwd(),
  "../.omo/evidence/bookgolas-web-completion/task-7-browser",
);

const tabs = {
  en: ["Home", "My Library", "Reading Chart", "Calendar", "My Page"],
  ko: ["홈", "서재", "상태", "캘린더", "MY"],
} as const;

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

test("desktop shell exposes exactly five tabs, deep-link state, search modes and timer mount", async ({ context, page }) => {
  await setFixture(context, "authenticated-not-found");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/en/home?view=planned", { waitUntil: "networkidle" });

  const navigation = page.getByTestId("consumer-desktop-navigation");
  for (const label of tabs.en) await expect(navigation.getByRole("link", { name: label })).toBeVisible();
  await expect(navigation.getByRole("link")).toHaveCount(7);
  await expect(navigation.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("consumer-shell")).toHaveAttribute("data-home-view", "planned");
  await expect(page.getByTestId("consumer-timer-mount")).toBeVisible();

  await navigation.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("button", { name: /^Book search/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Recall/ })).toBeVisible();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(navigation.getByRole("button", { name: "Search" })).toBeFocused();
  await navigation.getByRole("button", { name: "Search" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Close search modes" }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: /^Recall/ })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Close search modes" })).toBeFocused();
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(300);
  await capture(page, "task-14-bookgolas-web-app-parity.png");

  await page.getByRole("button", { name: /^Book search/ }).click();
  await expect(page).toHaveURL(/\/en\/books\/new\?mode=search$/);
  // Firefox can publish the target URL before the client destination mounts.
  // Wait for that actual page rather than treating the transient URL as ready.
  await expect(page.getByTestId("book-discovery-page")).toBeVisible();
  await page.goto("/en/home?view=planned", { waitUntil: "networkidle" });
  await navigation.getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: /^Recall/ }).click();
  await expect(page).toHaveURL(/\/en\/library\?view=records&mode=recall$/);
  await expect(page.getByTestId("consumer-shell")).toHaveAttribute("data-active-tab", "library");
  // Recall intentionally does not load the library collection; its own panel is
  // the ready destination. Firefox can expose the history URL before that
  // client has mounted, so wait for the actual destination before reloading.
  await expect(page.getByTestId("library-recall-panel")).toBeVisible();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/en\/library\?view=records&mode=recall$/);
  await expect(page.getByTestId("consumer-shell")).toHaveAttribute("data-active-tab", "library");

  await page.goto("/en/home?view=planned&filter=mine", { waitUntil: "networkidle" });
  await navigation.getByRole("link", { name: "KO" }).click();
  await expect(page).toHaveURL(/\/ko\/home\?view=planned&filter=mine$/);
});

test("mobile shell keeps five tabs and cycles home and chart re-taps in the URL", async ({ context, page }) => {
  await setFixture(context, "authenticated-not-found");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/ko/home", { waitUntil: "networkidle" });

  const navigation = page.getByTestId("consumer-mobile-navigation");
  for (const label of tabs.ko) await expect(navigation.getByRole("button", { name: label })).toBeVisible();
  await navigation.getByRole("button", { name: "홈" }).click();
  await expect(page).toHaveURL(/\/ko\/home\?view=planned$/);
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("consumer-shell")).toHaveAttribute("data-home-view", "planned");

  await navigation.getByRole("button", { name: "상태" }).click();
  await expect(page).toHaveURL(/\/ko\/stats$/);
  await navigation.getByRole("button", { name: "상태" }).click();
  await expect(page).toHaveURL(/\/ko\/stats\?view=pages$/);
  await expect(page.getByTestId("consumer-shell")).toHaveAttribute("data-chart-view", "pages");
  await capture(page, "task-14-SURFACE-mobile-five-tabs.png");
});

test("pending and error boundaries remain inside the authenticated shell", async ({ context, page }) => {
  await setFixture(context, "pending");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en/stats", { waitUntil: "networkidle" });
  await page.getByTestId("consumer-desktop-navigation").getByRole("link", { name: "Home" }).click();
  await expect(page.locator('[data-route-state="pending"]')).toBeVisible();
  await capture(page, "task-14-SURFACE-pending.png");
  await expect(page.locator('[data-route-state="ready"]')).toBeVisible();

  await setFixture(context, "unavailable");
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator('[data-route-state="error"]')).toBeVisible();
  await expect(page.getByTestId("consumer-shell")).toHaveAttribute("data-active-tab", "home");
  await capture(page, "task-14-SURFACE-error.png");
});

test("unauthorized-private-data fixture never renders another reader's book", async ({ context, page }) => {
  await setFixture(context, "unauthorized-private-data");
  await page.goto("/en/books/00000000-0000-4000-8000-000000004251", { waitUntil: "networkidle" });

  await expect(page.locator('[data-route-state="not-found-or-forbidden"]')).toBeVisible();
  await expect(page.getByText("Foreign private title")).toHaveCount(0);
  await expect(page.getByTestId("consumer-shell")).toHaveCount(0);
});

test("expired-session redirects a refreshed private deep link to sign in", async ({ context, page }) => {
  await setFixture(context, "expired-session");
  await page.goto("/en/library?view=records", { waitUntil: "networkidle" });

  await expect(page).toHaveURL(/\/en\/auth\/sign-in\?returnTo=%2Fen%2Flibrary%3Fview%3Drecords$/);
  await expect(page.getByRole("heading", { name: "Sign in to Bookgolas" })).toBeVisible();
  await expect(page.getByTestId("consumer-shell")).toHaveCount(0);
});

test("announcements expose localized content, empty and error states without private reading data", async ({ context, page }) => {
  await setFixture(context, "announcements-content");
  await page.goto("/en/announcements", { waitUntil: "networkidle" });
  await expect(page.getByTestId("consumer-announcements")).toHaveAttribute("data-route-state", "ready");
  await expect(page.getByTestId("consumer-announcement")).toContainText("Bookgolas Web update");
  await expect(page.getByText("Foreign private title")).toHaveCount(0);
  await capture(page, "task-7-announcements-content.png");

  await setFixture(context, "announcements-empty");
  await page.goto("/ko/announcements", { waitUntil: "networkidle" });
  await expect(page.getByTestId("consumer-announcements")).toHaveAttribute("data-route-state", "ready");
  await expect(page.getByText("아직 공지사항이 없습니다")).toBeVisible();
  await capture(page, "task-7-announcements-empty.png");

  await setFixture(context, "announcements-error");
  await page.goto("/en/announcements", { waitUntil: "networkidle" });
  await expect(page.getByTestId("consumer-announcements")).toHaveAttribute("data-route-state", "error");
  await expect(page.getByText("We could not load announcements")).toBeVisible();
  await capture(page, "task-7-announcements-error.png");
});

test("anonymous announcements deep link redirects before announcement or completion data renders", async ({ page }) => {
  await page.goto("/en/announcements", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/en\/auth\/sign-in\?returnTo=%2Fen%2Fannouncements$/);
  await expect(page.getByTestId("consumer-announcements")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("hasSeenOnboarding_v1");
});

test("anonymous account request redirects before private profile or onboarding state renders", async ({ page }) => {
  await page.goto("/en/account", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/en\/auth\/sign-in\?returnTo=%2Fen%2Faccount$/);
  await expect(page.getByTestId("account-settings")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("hasSeenOnboarding_v1");
  await capture(page, "task-7-account-unauthenticated.png");
});

test("Korean terms and English privacy pages render localized legal copy", async ({ page }) => {
  await page.goto("/ko/terms", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "이용약관" })).toBeVisible();
  await expect(page.getByText("제1조 (목적)")).toBeVisible();
  await capture(page, "task-7-terms-ko.png");

  await page.goto("/en/privacy", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  await expect(page.getByText("1. Purpose of Collection and Use")).toBeVisible();
  await capture(page, "task-7-privacy-en.png");
});
