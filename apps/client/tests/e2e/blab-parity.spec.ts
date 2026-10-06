import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext } from "@playwright/test";

const evidenceDirectory = path.resolve(
  process.cwd(),
  "docs/evidence/bookgolas-web-app-parity",
);

const viewports = [
  { id: "mobile", width: 390, height: 844 },
  { id: "desktop", width: 1440, height: 900 },
] as const;

async function setUnavailableFixture(context: BrowserContext) {
  await context.addCookies([
    { name: "bookgolas-route-fixture", value: "unavailable", domain: "127.0.0.1", path: "/" },
    { name: "bookgolas-route-fixture", value: "unavailable", domain: "localhost", path: "/" },
  ]);
}

for (const locale of ["ko", "en"] as const) {
  for (const viewport of viewports) {
    test(`${locale} BLDS consumer contract at ${viewport.id}`, async ({ context, page }, testInfo) => {
      fs.mkdirSync(evidenceDirectory, { recursive: true });
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const theme of ["light", "dark"] as const) {
        // The auth contract below clears the route fixture after each theme.
        // Re-establish it here so the next BLDS pass remains fixture-backed.
        await setUnavailableFixture(context);
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
        await page.goto(`/${locale}/home`, { waitUntil: "networkidle" });
        await expect(page.locator("html")).toHaveAttribute("data-blab-theme", theme);
        const refreshButton = page.getByRole("button", {
          name: locale === "ko" ? "새로고침" : "Refresh",
        }).first();
        await expect(refreshButton).toHaveAttribute("data-blab-component", "button");
        await refreshButton.focus();
        await expect(refreshButton).toBeFocused();
        await refreshButton.click();
        const errorNotice = page.locator(".blab-error-state").first();
        await expect(errorNotice).toBeVisible();
        const retryAction = errorNotice.locator("..").getByRole("button", {
          name: locale === "ko" ? "새로고침" : "Refresh",
        });
        await retryAction.focus();
        await expect(retryAction).toBeFocused();
        await retryAction.click();
        await expect(errorNotice).toBeVisible();

        const buttonStyle = await refreshButton.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            color: style.color,
            backgroundColor: style.backgroundColor,
            transitionDuration: style.transitionDuration,
          };
        });
        expect(buttonStyle.color).toBe(theme === "dark" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)");
        expect(buttonStyle.backgroundColor).toBe(
          theme === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
        );
        expect(Number.parseFloat(buttonStyle.transitionDuration)).toBeLessThanOrEqual(0.001);

        if (testInfo.project.name === "chromium") {
          const screenshotPath = path.join(
            evidenceDirectory,
            `task-9-5-blab-react-parity-${locale}-${viewport.id}-${theme}.png`,
          );
          await page.screenshot({ path: screenshotPath, fullPage: true });
          if (locale === "ko" && viewport.id === "mobile" && theme === "dark") {
            await page.screenshot({
              path: path.join(evidenceDirectory, "task-9-5-blab-react-parity.png"),
              fullPage: true,
            });
          }
        }

      }

      // Firefox can retain the previous home-page navigation while its route
      // fixture settles. Assert the independent auth primitive in a fresh page.
      const authPage = await context.newPage();
      await authPage.goto(`/${locale}/auth/sign-in`, { waitUntil: "domcontentloaded" });
      const authButton = authPage.getByRole("button", { name: locale === "ko" ? "로그인" : "Sign in" });
      await expect(authButton).toHaveAttribute("data-blab-component", "button");
      await expect(authButton).toHaveAccessibleName(locale === "ko" ? "로그인" : "Sign in");
      await expect(authPage.getByRole("textbox")).toHaveCount(2);
      await expect(authPage.getByRole("textbox", { name: locale === "ko" ? "이메일" : "Email" })).toHaveAccessibleName(
        locale === "ko" ? "이메일" : "Email",
      );
      await expect(authPage.locator('[data-blab-component="text-field"]')).toHaveCount(2);
      await authPage.close();
    });
  }
}

test("missing-session fails closed for the consumer home", async ({ page }) => {
  await page.goto("/en/home", { waitUntil: "networkidle" });
  const destination = new URL(page.url());

  if (destination.pathname === "/en/auth/sign-in") {
    expect(destination.searchParams.get("returnTo")).toBe("/en/home");
    return;
  }

  expect(destination.pathname).toBe("/en/home");
  await expect(page.locator(".blab-error-state")).toBeVisible();
  await expect(page.locator('a[href*="/books/"]')).toHaveCount(0);
});
