import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const bookId = "00000000-0000-4000-8000-000000002001";
const evidenceDirectory = path.resolve(
  process.cwd(),
  "../.omo/evidence/bookgolas-web-app-parity",
);
const protectedRoutes = [
  "/announcements",
  "/onboarding",
  "/home",
  "/library",
  "/stats",
  "/calendar",
  "/account",
  "/account/notifications",
  "/book-list",
  "/books/new",
  "/books/scan",
  "/subscription",
] as const;

async function addAuthenticatedRouteFixture(page: Page) {
  const url = new URL(page.url());
  await page.context().addCookies([
    {
      name: "bookgolas-route-fixture",
      value: "authenticated-not-found",
      domain: url.hostname,
      path: "/",
    },
  ]);
}

test("localized consumer routes resolve inside the authenticated boundary", async ({ page }) => {
  await page.goto("/ko/home", { waitUntil: "domcontentloaded" });
  await addAuthenticatedRouteFixture(page);

  for (const locale of ["ko", "en"] as const) {
    for (const route of protectedRoutes) {
      const response = await page.goto(`/${locale}${route}`, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${locale}${route}`).toBe(200);
      await expect(page.locator("main")).toBeVisible();
    }

    for (const route of [`/books/${bookId}`, `/reading/${bookId}`]) {
      const response = await page.goto(`/${locale}${route}`, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${locale}${route}`).toBe(200);
      await expect(page.locator('[data-route-state="not-found-or-forbidden"]')).toBeVisible();
      await expect(page.locator("body")).not.toContainText(bookId);
      if (locale === "en" && route.startsWith("/books/")) {
        fs.mkdirSync(evidenceDirectory, { recursive: true });
        await page.screenshot({
          path: path.join(evidenceDirectory, "task-10-consumer-detail-not-found.png"),
          fullPage: true,
        });
      }
    }
  }
});

test("unauthorized consumers are redirected to a localized sign-in with a safe return target", async ({ page }) => {
  const target = "/ko/library?view=all";
  await page.goto(target, { waitUntil: "domcontentloaded" });

  const location = new URL(page.url());
  expect(location.pathname).toBe("/ko/auth/sign-in");
  expect(location.searchParams.get("returnTo")).toBe(target);
  await expect(page.getByRole("heading", { name: "북골라스 로그인" })).toBeVisible();
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(evidenceDirectory, "task-10-consumer-unauthorized-ko.png"),
    fullPage: true,
  });
});

test("unsafe return targets fall back to the authenticated home route", async ({ page }) => {
  await page.goto("/en/auth/sign-in?returnTo=https%3A%2F%2Fevil.example%2Faccount", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: "Sign in to Bookgolas" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("evil.example");
});

test("locale metadata and public route boundaries remain intact", async ({ page }) => {
  await page.goto("/en", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveTitle(/Bookgolas/);

  await page.goto("/ko", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page).toHaveTitle(/북골라스/);

  for (const route of ["/privacy", "/terms", "/support"]) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status(), route).toBe(200);
  }

  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  expect(new URL(page.url()).pathname).toBe("/admin/login");
  await expect(page.getByText("Bookgolas Admin")).toBeVisible();
});
