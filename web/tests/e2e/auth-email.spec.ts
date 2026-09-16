import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const fixtureAuthOrigin = "http://127.0.0.1:54329";
const evidenceDirectory = path.resolve(
  process.cwd(),
  "../.omo/evidence/bookgolas-web-app-parity",
);
const fixtureUserId = "00000000-0000-4000-8000-000000004230";
const now = "2026-09-16T00:00:00.000Z";

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

function fixtureUser(email = "reader@local.invalid") {
  return {
    id: fixtureUserId,
    aud: "authenticated",
    role: "authenticated",
    email,
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

function sessionResponse(email: string) {
  return {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: 1893456000,
    refresh_token: "fixture-refresh-token",
    user: fixtureUser(email),
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

async function installAuthFixture(page: Page) {
  const requests: Array<{ pathname: string; body: Record<string, unknown> }> = [];

  await page.route(`${fixtureAuthOrigin}/auth/v1/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") {
      await fulfillJson(route, {});
      return;
    }

    let body: Record<string, unknown> = {};
    try {
      body = request.postDataJSON() as Record<string, unknown>;
    } catch {
      body = {};
    }
    requests.push({ pathname: url.pathname, body });

    if (url.pathname.endsWith("/token")) {
      const email = String(body.email ?? "");
      if (email === "invalid@local.invalid") {
        await fulfillJson(route, { code: "invalid_credentials", msg: "Invalid login credentials" }, 400);
        return;
      }
      if (email === "unconfirmed@local.invalid") {
        await fulfillJson(route, { code: "email_not_confirmed", msg: "Email not confirmed" }, 400);
        return;
      }
      await page.context().addCookies([
        {
          name: "bookgolas-route-fixture",
          value: "authenticated-not-found",
          domain: "127.0.0.1",
          path: "/",
        },
      ]);
      await fulfillJson(route, sessionResponse(email));
      return;
    }

    if (url.pathname.endsWith("/signup")) {
      await fulfillJson(route, fixtureUser(String(body.email ?? "reader@local.invalid")));
      return;
    }

    if (url.pathname.endsWith("/user")) {
      await fulfillJson(route, fixtureUser());
      return;
    }

    if (url.pathname.endsWith("/logout")) {
      await fulfillJson(route, {});
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

const responsiveViewports = [
  { id: "mobile", width: 375, height: 844 },
  { id: "tablet", width: 768, height: 900 },
  { id: "desktop", width: 1280, height: 900 },
] as const;

for (const locale of ["ko", "en"] as const) {
  for (const route of ["sign-in", "sign-up", "reset-password"] as const) {
    for (const viewport of responsiveViewports) {
      for (const theme of ["light", "dark"] as const) {
        test(`responsive ${locale} ${route} ${viewport.id} ${theme}`, async ({ page }) => {
          await installAuthFixture(page);
          await page.emulateMedia({ colorScheme: theme });
          await page.setViewportSize(viewport);
          await page.goto(`/${locale}/auth/${route}`, { waitUntil: "networkidle" });
          await expect(page.locator("main")).toBeVisible();
          fs.mkdirSync(evidenceDirectory, { recursive: true });
          await page.screenshot({
            path: path.join(
              evidenceDirectory,
              `task-11-SURFACE-${locale}-${route}-${viewport.id}-${theme}.png`,
            ),
          });
        });
      }
    }
  }
}

test("signup validates nickname and creates an email account", async ({ page }) => {
  const requests = await installAuthFixture(page);
  await page.goto("/ko/auth/sign-up", { waitUntil: "networkidle" });

  await page.getByRole("textbox", { name: "이메일" }).fill("new-reader@local.invalid");
  await page.getByLabel("비밀번호", { exact: true }).fill("secret1");
  await page.getByRole("button", { name: "계정 만들기" }).click();
  await expect(page.locator("form [role='alert']")).toHaveText("닉네임을 입력하세요.");

  await page.getByRole("textbox", { name: "닉네임" }).fill("새 독자");
  await page.getByRole("button", { name: "계정 만들기" }).click();
  await expect(page.getByRole("status")).toContainText("이메일을 확인해 계정을 인증하세요");

  const signupRequest = requests.find((request) => request.pathname.endsWith("/signup"));
  expect(signupRequest?.body).toMatchObject({
    email: "new-reader@local.invalid",
    data: { name: "새 독자" },
  });
  expect(signupRequest?.body).toHaveProperty("password", "secret1");
  await capture(page, "task-11-SURFACE-signup-ko.png");
});

test("login saves opted-in email and logout clears browser and server session", async ({ page }) => {
  const requests = await installAuthFixture(page);
  await page.goto("/en/auth/sign-in", { waitUntil: "networkidle" });

  await page.getByRole("textbox", { name: "Email" }).fill("reader@local.invalid");
  await page.getByLabel("Password", { exact: true }).fill("secret1");
  await page.getByRole("checkbox", { name: "Save email on this device" }).check();
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/home$/);
  await capture(page, "task-11-SURFACE-login-en.png");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect.poll(() => requests.map((request) => request.pathname)).toContain("/auth/v1/logout");
  await expect(page).toHaveURL(/\/en\/auth\/sign-in$/, { timeout: 10_000 });
  const authCookies = (await page.context().cookies()).filter((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
  expect(authCookies).toHaveLength(0);

  await page.context().clearCookies({ name: "bookgolas-route-fixture" });
  await page.goto("/en/home", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/en\/auth\/sign-in\?returnTo=/);
  await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue("reader@local.invalid");
});

test("recovery sends a non-enumerating link and updates the password", async ({ page }) => {
  const requests = await installAuthFixture(page);
  await page.goto("/en/auth/reset-password", { waitUntil: "networkidle" });
  await page.getByRole("textbox", { name: "Email" }).fill("missing@local.invalid");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toHaveText("If an account exists for this email, a reset link has been sent.");

  const recoveryRequest = requests.find((request) => request.pathname.endsWith("/recover"));
  expect(recoveryRequest?.body).toHaveProperty("email", "missing@local.invalid");

  await page.goto("/en/auth/sign-in", { waitUntil: "networkidle" });
  await page.getByRole("textbox", { name: "Email" }).fill("reader@local.invalid");
  await page.getByLabel("Password", { exact: true }).fill("secret1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/home$/);

  await page.goto("/en/auth/reset-password?recovery=1", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
  await page.getByLabel("New password", { exact: true }).fill("changed1");
  await page.getByLabel("Confirm password", { exact: true }).fill("changed1");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByRole("status")).toContainText("Your password was updated");
  await capture(page, "task-11-SURFACE-recovery-en.png");
});

test("invalid credentials show a localized non-enumerating error", async ({ page }) => {
  await installAuthFixture(page);
  await page.goto("/ko/auth/sign-in", { waitUntil: "networkidle" });
  await page.getByRole("textbox", { name: "이메일" }).fill("invalid@local.invalid");
  await page.getByLabel("비밀번호", { exact: true }).fill("wrong1");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.locator("form [role='alert']")).toHaveText("이메일 또는 비밀번호가 올바르지 않습니다.");
  await expect(page.locator("body")).not.toContainText("계정이 없습니다");
  await capture(page, "task-11-SURFACE-invalid-ko.png");
});

test("unconfirmed email supports a localized resend cooldown", async ({ page }) => {
  await installAuthFixture(page);
  await page.goto("/en/auth/sign-in", { waitUntil: "networkidle" });
  await page.getByRole("textbox", { name: "Email" }).fill("unconfirmed@local.invalid");
  await page.getByLabel("Password", { exact: true }).fill("secret1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("form [role='alert']")).toHaveText("Confirm your email before signing in.");

  await page.getByRole("button", { name: "Resend confirmation email" }).click();
  await expect(page.getByRole("status")).toContainText("new email has been sent");
  await expect(page.getByRole("button", { name: /Resend in \d+s/ })).toBeDisabled();
  await capture(page, "task-11-SURFACE-unconfirmed-en.png");
});
