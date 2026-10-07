import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const bookId = "00000000-0000-4000-8000-000000002001";
const evidenceDirectory = path.resolve(
  process.cwd(),
  "../.omo/evidence/bookgolas-web-completion/task-11-browser",
);
const boundaryEvidenceDirectory = path.resolve(
  process.cwd(),
  "../.omo/evidence/bookgolas-web-completion/task-17-artifacts",
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

async function setFixture(context: BrowserContext, value: string) {
  await context.addCookies([
    { name: "bookgolas-route-fixture", value, domain: "127.0.0.1", path: "/" },
    { name: "bookgolas-route-fixture", value, domain: "localhost", path: "/" },
  ]);
}

test("localized consumer routes resolve inside the authenticated boundary", async ({ page }) => {
  await page.goto("/ko/home", { waitUntil: "domcontentloaded" });
  await addAuthenticatedRouteFixture(page);

  for (const locale of ["ko", "en"] as const) {
    for (const route of protectedRoutes) {
      const response = await page.goto(`/${locale}${route}`, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${locale}${route}`).toBe(200);
      await expect(page.locator("main").first()).toBeVisible();
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

test("all four canonical localized book deep links resolve exact destination state", async ({ context, page }) => {
  await context.addCookies([
    { name: "bookgolas-route-fixture", value: "book-detail-reading", domain: "127.0.0.1", path: "/" },
    { name: "bookgolas-route-fixture", value: "book-detail-reading", domain: "localhost", path: "/" },
  ]);

  const mappings = [
    ["search", "/en/books/new"],
    ["detail", `/en/books/${bookId}`],
    ["record", `/en/books/${bookId}?tab=history`],
    ["scan", `/en/books/${bookId}?scan=1`],
  ] as const;

  for (const [name, target] of mappings) {
    const response = await page.goto(target, { waitUntil: "networkidle" });
    expect(response?.status(), name).toBe(200);
    expect(new URL(page.url()).pathname + new URL(page.url()).search, name).toBe(target);
    if (name === "record") {
      await expect(page.getByTestId("book-detail-live")).toHaveAttribute("data-active-tab", "history");
      await expect(page.getByTestId("book-detail-history-panel")).toBeVisible();
    }
    if (name === "scan") {
      await expect(page.getByTestId("book-detail-live")).toHaveAttribute("data-active-tab", "memorable");
      await expect(page.getByTestId("book-detail-scan-flow")).toBeVisible();
    }
    fs.mkdirSync(evidenceDirectory, { recursive: true });
    await page.screenshot({ path: path.join(evidenceDirectory, `task-11-deep-link-${name}.png`), fullPage: true });
  }
});

test("duplicate and encoded query shapes cannot bypass canonical detail state", async ({ context, page }) => {
  await context.addCookies([
    { name: "bookgolas-route-fixture", value: "book-detail-reading", domain: "127.0.0.1", path: "/" },
    { name: "bookgolas-route-fixture", value: "book-detail-reading", domain: "localhost", path: "/" },
  ]);

  for (const query of ["tab=history&tab=detail", "tab%5B%5D=history", "scan=1&scan=0", "scan%5B%5D=1"]) {
    await page.goto(`/en/books/${bookId}?${query}`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("book-detail-live")).toHaveAttribute("data-active-tab", "detail");
    await expect(page.getByTestId("book-detail-live")).toHaveAttribute("data-auto-scan", "false");
    await expect(page.getByTestId("book-detail-history-panel")).toHaveCount(0);
    await expect(page.getByTestId("book-detail-scan-flow")).toHaveCount(0);
  }
});

test("unsafe return targets fall back to the authenticated home route", async ({ page }) => {
  await page.goto("/en/auth/sign-in?returnTo=https%3A%2F%2Fevil.example%2Faccount", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: "Sign in to Bookgolas" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("evil.example");
});

test("subscription and native-only surfaces stay disabled while ordinary HTTPS links remain available", async ({ context, page }) => {
  await setFixture(context, "authenticated-not-found");
  await page.goto("/en/subscription", { waitUntil: "networkidle" });
  const disabled = page.getByTestId("subscription-disabled");
  await expect(disabled).toHaveAttribute("data-route-state", "disabled");
  await expect(disabled).toHaveAttribute("data-subscription-enabled", "false");
  await expect(page.getByTestId("subscription-status")).toBeVisible();
  await expect(disabled.locator("button")).toHaveCount(0);
  await expect(page.getByTestId("subscription-back")).toHaveAttribute("href", "/en/account");
  const interactiveCopy = await page.locator('a, button, [role="button"]').allTextContents();
  expect(interactiveCopy.join(" ")).not.toMatch(/purchase|restore purchase|upgrade|customer center|revenuecat|native widget|siri|app shortcut/i);
  fs.mkdirSync(boundaryEvidenceDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(boundaryEvidenceDirectory, "task-17-subscription-disabled.png"),
    fullPage: true,
  });

  await setFixture(context, "book-detail-reading");
  await page.goto(`/en/books/${bookId}`, { waitUntil: "networkidle" });
  const storeLink = page.getByTestId("book-detail-store-link");
  await expect(storeLink).toHaveAttribute("href", /^https:\/\//);
  await expect(storeLink).toHaveAttribute("target", "_blank");
  await page.screenshot({
    path: path.join(boundaryEvidenceDirectory, "task-17-https-provider-allowed.png"),
    fullPage: true,
  });
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
    expect(new URL(page.url()).pathname, route).toBe("/ko" + route);
    await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  }

  const localizedLegalRoutes = [
    ["/terms", "Terms of Service", "The Web experience currently provides account and reading features without payment or subscription controls."],
    ["/support", "Support", "Web subscription and billing controls are unavailable."],
    ["/privacy", "Privacy Policy", "RevenueCat: native app purchase management; Web billing is not enabled"],
  ] as const;
  for (const [route, title, copy] of localizedLegalRoutes) {
    const response = await page.goto("/en" + route, { waitUntil: "domcontentloaded" });
    expect(response?.status(), "/en" + route).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page).toHaveTitle(new RegExp(title));
    await expect(page.locator("body")).toContainText(copy);
  }

});
