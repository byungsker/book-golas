import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const evidenceDirectory = path.resolve(
  process.cwd(),
  "../.omo/evidence/bookgolas-web-app-parity",
);

const copy = {
  ko: {
    pages: ["독서 기록하기", "인상적인 순간 저장", "목표 달성하기"],
    next: "다음",
    start: "시작하기",
    skip: "건너뛰기",
    ageTitle: "연령 및 광고 설정",
    choice: "14세 미만",
    status: "under14",
  },
  en: {
    pages: ["Track Your Reading", "Save Memorable Moments", "Achieve Your Goals"],
    next: "Next",
    start: "Start",
    skip: "Skip",
    ageTitle: "Age and advertising",
    choice: "14 or older",
    status: "age14OrOlder",
  },
} as const;

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

for (const locale of ["ko", "en"] as const) {
  test(`${locale} three-page onboarding persists age policy through skip and start`, async ({ context, page }) => {
    const strings = copy[locale];
    await enableAuthenticatedTarget(context);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: locale === "ko" ? "dark" : "light", reducedMotion: "reduce" });
    await page.goto(`/${locale}/onboarding`, { waitUntil: "networkidle" });

    for (let index = 0; index < strings.pages.length; index += 1) {
      await expect(page.getByRole("heading", { name: strings.pages[index] })).toBeVisible();
      const indicator = locale === "ko"
        ? `3개 중 ${index + 1}번째 페이지`
        : `Page ${index + 1} of 3`;
      await expect(page.getByLabel(indicator)).toHaveAttribute("aria-current", "step");
      await capture(page, `task-13-SURFACE-${locale}-page-${index + 1}.png`);
      if (index < strings.pages.length - 1) {
        await page.getByRole("button", { name: strings.next }).click();
      }
    }

    await page.getByRole("button", { name: strings.start }).click();
    await expect(page.getByRole("dialog", { name: strings.ageTitle })).toBeVisible();
    await capture(page, `task-13-SURFACE-${locale}-age-policy-start.png`);
    await page.getByRole("button", { name: locale === "ko" ? "온보딩으로 돌아가기" : "Back to onboarding" }).click();
    await page.getByRole("button", { name: strings.skip }).click();
    await expect(page.getByRole("dialog", { name: strings.ageTitle })).toBeVisible();
    await capture(page, `task-13-SURFACE-${locale}-age-policy-skip.png`);
    await page.getByRole("button", { name: new RegExp(`^${strings.choice}`) }).click();

    await expect(page).toHaveURL(new RegExp(`/${locale}/home$`));
    expect(await page.evaluate(() => localStorage.getItem("hasSeenOnboarding_v1"))).toBe("true");
    expect(await page.evaluate(() => localStorage.getItem("age_policy_status"))).toBe(strings.status);
    await capture(page, `task-13-SURFACE-${locale}-auth-handoff.png`);

    await page.reload({ waitUntil: "networkidle" });
    await expect(page).toHaveURL(new RegExp(`/${locale}/home$`));
    await page.goto(`/${locale}/onboarding`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(new RegExp(`/${locale}/home$`));
  });
}

test("authenticated corrupt-storage state resets and remains completable", async ({ context, page }) => {
  await enableAuthenticatedTarget(context);
  await page.goto("/en/onboarding", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.setItem("hasSeenOnboarding_v1", "{broken");
    localStorage.setItem("age_policy_status", "unknown-age");
  });
  await page.reload({ waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: "Track Your Reading" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("hasSeenOnboarding_v1"))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("age_policy_status"))).toBeNull();
  await capture(page, "task-13-SURFACE-corrupt-storage-recovered.png");

  await page.getByRole("button", { name: "Skip" }).click();
  await page.getByRole("button", { name: /^Under 14/ }).click();
  await expect(page).toHaveURL(/\/en\/home$/);
});

test("anonymous onboarding uses the localized authentication handoff", async ({ context, page }) => {
  await page.goto("/ko/onboarding", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/ko\/auth\/sign-in\?returnTo=%2Fko%2Fonboarding$/);
  await expect(page.getByRole("heading", { name: "북골라스 로그인" })).toBeVisible();
  await capture(page, "task-13-SURFACE-auth-handoff-sign-in.png");

  await enableAuthenticatedTarget(context);
  await page.goto("/ko/onboarding", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "독서 기록하기" })).toBeVisible();
});
