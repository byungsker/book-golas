import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const evidenceDirectory = path.resolve(
  process.cwd(),
  "../.omo/evidence/bookgolas-web-app-parity",
);

async function enableAuthenticatedTarget(context: BrowserContext) {
  await context.addCookies([
    {
      name: "bookgolas-route-fixture",
      value: "authenticated-not-found",
      domain: "127.0.0.1",
      path: "/",
    },
    {
      name: "bookgolas-route-fixture",
      value: "authenticated-not-found",
      domain: "localhost",
      path: "/",
    },
  ]);
}

async function capture(page: Page, name: string) {
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDirectory, name), fullPage: true });
}

for (const provider of ["Google", "Apple"] as const) {
  test(`${provider} PKCE success creates a session and preserves the locale return`, async ({ context, page }) => {
    await enableAuthenticatedTarget(context);
    await page.goto("/en/auth/sign-in?returnTo=%2Fen%2Fhome", { waitUntil: "networkidle" });

    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Apple" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Kakao");
    const authorizationRequest = page.waitForRequest(/\/auth\/v1\/authorize/);
    await page.getByRole("button", { name: `Continue with ${provider}` }).click();
    const authorizationUrl = new URL((await authorizationRequest).url());
    expect(authorizationUrl.searchParams.get("provider")).toBe(provider.toLowerCase());
    expect(authorizationUrl.searchParams.get("code_challenge")).toBeTruthy();

    await expect(page).toHaveURL(/\/en\/home$/);
    const sessionCookies = (await context.cookies()).filter(
      (cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"),
    );
    expect(sessionCookies.length).toBeGreaterThan(0);
    await capture(page, `task-12-SURFACE-${provider.toLowerCase()}-success.png`);
  });
}

test("invalid or expired callback code returns a generic localized error", async ({ page }) => {
  await page.goto("/ko/auth/callback?code=expired-code&returnTo=%2Fko%2Fhome");

  await expect(page).toHaveURL(/\/ko\/auth\/sign-in\?error=auth_callback&next=/);
  await expect(page.locator("form [role='alert']")).toHaveText(
    "로그인 링크가 올바르지 않거나 만료되었습니다. 로그인을 다시 시작하세요.",
  );
  expect(page.url()).not.toContain("expired-code");
  await capture(page, "task-12-SURFACE-invalid-code.png");
});

test("invalid provider cancellation hides provider details", async ({ page }) => {
  await page.goto(
    "/en/auth/callback?error=access_denied&error_description=private-provider-detail&error_code=secret-code&returnTo=%2Fen%2Fhome",
  );

  await expect(page).toHaveURL(/\/en\/auth\/sign-in\?error=oauth_cancelled&next=/);
  await expect(page.locator("form [role='alert']")).toHaveText(
    "Sign-in was cancelled. You can try again when you are ready.",
  );
  expect(page.url()).not.toContain("private-provider-detail");
  expect(page.url()).not.toContain("secret-code");
  await capture(page, "task-12-SURFACE-invalid-cancellation.png");
});

test("invalid provider error is generic and hides provider details", async ({ page }) => {
  await page.goto(
    "/ko/auth/callback?error=server_error&error_description=private-provider-detail&error_code=secret-code&returnTo=%2Fko%2Fhome",
  );

  await expect(page).toHaveURL(/\/ko\/auth\/sign-in\?error=oauth_provider&next=/);
  await expect(page.locator("form [role='alert']")).toHaveText(
    "제공업체 로그인을 완료하지 못했습니다. 다시 시도하세요.",
  );
  expect(page.url()).not.toContain("private-provider-detail");
  expect(page.url()).not.toContain("secret-code");
  await capture(page, "task-12-SURFACE-invalid-provider.png");
});

test("external returnTo is rejected by the full callback flow", async ({ context, page }) => {
  await enableAuthenticatedTarget(context);
  await page.goto("/ko/auth/sign-in?returnTo=https%3A%2F%2Fevil.example%2Faccount");
  await page.getByRole("button", { name: "Google로 계속하기" }).click();

  await expect(page).toHaveURL(/\/ko\/home$/);
  expect(page.url()).not.toContain("evil.example");
  await capture(page, "task-12-SURFACE-external-return-rejected.png");
});
