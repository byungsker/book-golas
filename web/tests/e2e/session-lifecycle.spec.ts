import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page, type Route } from "@playwright/test";

const fixtureAuthOrigin = "http://127.0.0.1:54329";
const fixtureUserId = "00000000-0000-4000-8000-000000004270";
const foreignBookId = "00000000-0000-4000-8000-000000004251";
const deletedBookId = "00000000-0000-4000-8000-000000004272";
const now = "2026-09-16T00:00:00.000Z";
const evidenceDirectory = path.resolve(process.cwd(), "../.omo/evidence/bookgolas-web-app-parity");

function base64Url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

const accessToken = `${base64Url({ alg: "HS256", typ: "JWT" })}.${base64Url({
  aud: "authenticated",
  email: "reader@local.invalid",
  exp: 1893456000,
  role: "authenticated",
  sub: fixtureUserId,
})}.fixture`;

function fixtureUser() {
  return {
    id: fixtureUserId,
    aud: "authenticated",
    role: "authenticated",
    email: "reader@local.invalid",
    email_confirmed_at: now,
    phone: "",
    confirmed_at: now,
    last_sign_in_at: now,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { name: "Reader" },
    identities: [],
    created_at: now,
    updated_at: now,
    is_anonymous: false,
  };
}

async function fulfillJson(route: Route, body: object, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
      "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
    },
    body: JSON.stringify(body),
  });
}

async function setFixture(context: BrowserContext, value: string) {
  await context.addCookies([
    { name: "bookgolas-route-fixture", value, domain: "127.0.0.1", path: "/" },
    { name: "bookgolas-route-fixture", value, domain: "localhost", path: "/" },
  ]);
}

async function installAuthFixture(page: Page) {
  const requests: string[] = [];
  await page.route(`${fixtureAuthOrigin}/auth/v1/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") {
      await fulfillJson(route, {});
      return;
    }
    requests.push(url.pathname);
    if (url.pathname.endsWith("/token")) {
      await setFixture(page.context(), "authenticated-not-found");
      await fulfillJson(route, {
        access_token: accessToken,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: 1893456000,
        refresh_token: "fixture-refresh-token",
        user: fixtureUser(),
      });
      return;
    }
    await fulfillJson(route, {});
  });
  return requests;
}

async function capture(page: Page, name: string) {
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDirectory, name), fullPage: true });
}

test("expired and invalid sessions produce one localized login redirect", async ({ context, page }) => {
  for (const fixture of ["expired-session", "invalid-session"]) {
    await setFixture(context, fixture);
    const loginNavigations: string[] = [];
    const privateRequests: string[] = [];
    const onRequest = (request: import("@playwright/test").Request) => {
      const pathname = new URL(request.url()).pathname;
      if (request.isNavigationRequest() && pathname === "/en/auth/sign-in") {
        loginNavigations.push(request.url());
      }
      if (pathname.includes("/rest/v1/books") || pathname.includes("Foreign private title") || pathname.includes("Deleted private title")) {
        privateRequests.push(request.url());
      }
    };
    page.on("request", onRequest);
    await page.goto(`/en/books/${foreignBookId}`, { waitUntil: "networkidle" });

    await expect(page).toHaveURL(new RegExp(`/en/auth/sign-in\\?returnTo=%2Fen%2Fbooks%2F${foreignBookId}`));
    expect(loginNavigations).toHaveLength(1);
    expect(privateRequests).toEqual([]);
    await expect(page.getByRole("heading", { name: "Sign in to Bookgolas" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Foreign private title");
    await expect(page.locator("body")).not.toContainText("Deleted private title");
    page.off("request", onRequest);
  }
});

test("foreign book IDs return the same safe not-found policy", async ({ context, page }) => {
  await setFixture(context, "unauthorized-private-data");
  const response = await page.goto(`/en/books/${foreignBookId}`, { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);
  await expect(page.locator('[data-route-state="not-found-or-forbidden"]')).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Foreign private title");
  await expect(page.locator("body")).not.toContainText(foreignBookId);
  await capture(page, "task-15-SURFACE-foreign-not-found.png");
});

test("deleted books return the same safe not-found policy", async ({ context, page }) => {
  await setFixture(context, "deleted-book");
  const response = await page.goto(`/ko/books/${deletedBookId}`, { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);
  await expect(page.locator('[data-route-state="not-found-or-forbidden"]')).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Deleted private title");
  await expect(page.locator("body")).not.toContainText(deletedBookId);
});

test("return-to login reloads the allowlisted deep link after authentication", async ({ context, page }) => {
  const requests = await installAuthFixture(page);
  await setFixture(context, "expired-session");
  const target = `/en/books/${deletedBookId}?tab=history`;
  await page.goto(target, { waitUntil: "networkidle" });

  await expect(page).toHaveURL(new RegExp(`/en/auth/sign-in\\?returnTo=%2Fen%2Fbooks%2F${deletedBookId}%3Ftab%3Dhistory$`));
  await page.getByLabel("Password", { exact: true }).fill("secret1");
  await page.getByRole("textbox", { name: "Email" }).fill("reader@local.invalid");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(new RegExp(`/en/books/${deletedBookId}\\?tab=history$`));
  await expect(page.locator('[data-route-state="not-found-or-forbidden"]')).toBeVisible();
  expect(requests).toContain("/auth/v1/token");
  await expect(page.locator("body")).not.toContainText("Deleted private title");
  await capture(page, "task-15-SURFACE-return-to-not-found.png");
});

test("logout from a private deep link ends on sign-in and never reuses the link", async ({ context, page }) => {
  const requests = await installAuthFixture(page);
  await page.goto("/en/auth/sign-in", { waitUntil: "networkidle" });
  await page.getByRole("textbox", { name: "Email" }).fill("reader@local.invalid");
  await page.getByLabel("Password", { exact: true }).fill("secret1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/home$/);
  await page.goto(`/en/books/${foreignBookId}`, { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();

  await expect.poll(() => requests).toContain("/auth/v1/logout");
  await expect(page).toHaveURL(/\/en\/auth\/sign-in$/);
  await expect(page.locator("body")).not.toContainText("Foreign private title");

  await context.clearCookies({ name: "bookgolas-route-fixture" });
  await page.goto(`/en/books/${foreignBookId}`, { waitUntil: "networkidle" });
  await expect(page).toHaveURL(new RegExp(`/en/auth/sign-in\\?returnTo=%2Fen%2Fbooks%2F${foreignBookId}`));
  await expect(page.locator("body")).not.toContainText("Foreign private title");
});

test("network loss during auth bootstrap exposes a safe unavailable boundary", async ({ context, page }) => {
  await setFixture(context, "bootstrap-network");
  await page.goto("/en/home", { waitUntil: "networkidle" });
  await expect(page.locator('[data-route-state="unavailable"]')).toBeVisible();
  await expect(page.getByTestId("consumer-shell")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("Foreign private title");
  await capture(page, "task-15-SURFACE-network-unavailable.png");
});
