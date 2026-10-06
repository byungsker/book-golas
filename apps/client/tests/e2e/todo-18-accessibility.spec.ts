import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";

const evidenceDirectory = path.resolve(
  process.cwd(),
  process.env.TASK18_EVIDENCE_DIR ?? "../.omo/evidence/bookgolas-web-completion/task-18-artifacts/screenshots",
);

async function setFixture(context: BrowserContext, value: string) {
  await context.addCookies([
    { name: "bookgolas-route-fixture", value, domain: "127.0.0.1", path: "/" },
    { name: "bookgolas-route-fixture", value, domain: "localhost", path: "/" },
  ]);
}

async function waitForSettledOverlay(page: Page) {
  const overlayIsSettled = () => {
    const surfaces = Array.from(
      document.querySelectorAll<HTMLElement>('[role="dialog"], [data-slot="dialog-overlay"]'),
    ).filter((element) => {
      const style = getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden";
    });

    return surfaces.length > 0 && surfaces.every((surface) => {
      const style = getComputedStyle(surface);
      const transform = new DOMMatrixReadOnly(style.transform);
      return Number.parseFloat(style.opacity) === 1 &&
        Math.abs(transform.a - 1) < 0.001 &&
        Math.abs(transform.b) < 0.001 &&
        Math.abs(transform.c) < 0.001 &&
        Math.abs(transform.d - 1) < 0.001 &&
        surface.getAnimations().every((animation) => animation.playState !== "running");
    });
  };

  await page.waitForFunction(overlayIsSettled, undefined, { timeout: 2_500 });
  await page.waitForTimeout(125);
  await page.waitForFunction(overlayIsSettled, undefined, { timeout: 2_500 });
}

async function capture(page: Page, name: string) {
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  await waitForSettledOverlay(page);
  await page.screenshot({ path: path.join(evidenceDirectory, name), fullPage: true });
}

async function expectFocusContained(page: Page, testId: string) {
  await expect.poll(() => page.evaluate((id) => {
      const dialog = document.querySelector(`[data-testid="${id}"]`);
      return dialog?.contains(document.activeElement) ?? false;
    }, testId)).toBe(true);
}

async function expectModalLifecycle(page: Page, dialog: Locator, trigger: Locator) {
  await expect(dialog).toHaveRole("dialog");
  await expect(dialog).toHaveAccessibleName(/.+/);
  await expect.poll(() => dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Tab");
  await expect.poll(() => dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.bringToFront();
  await expect(trigger).toBeFocused();
}

test("Korean calendar dialog traps focus, closes with Escape, and returns focus", async ({ context, page }) => {
  await setFixture(context, "calendar-happy");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/ko/calendar?year=2026&month=9", { waitUntil: "networkidle" });
  const gridWrap = page.getByTestId("calendar-grid-wrap");
  await expect.poll(() => gridWrap.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  for (const header of await page.getByRole("columnheader").all()) {
    expect(await header.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
  const trigger = page.getByTestId("calendar-day-2026-09-02");
  await trigger.click();
  await expect(page.getByTestId("calendar-day-detail")).toHaveRole("dialog");
  await expectFocusContained(page, "calendar-day-detail");
  await page.keyboard.press("Shift+Tab");
  await expectFocusContained(page, "calendar-day-detail");
  await capture(page, "calendar-ko-mobile-dark-dialog-focus.png");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("calendar-day-detail")).toHaveCount(0);
  await page.bringToFront();
  await expect(trigger).toBeFocused();
});

test("reading-goal and date-range-picker contain focus and expose alert validation", async ({ context, page }) => {
  await setFixture(context, "charts-goals-happy");
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/en/stats?view=annual&year=2026&status=all", { waitUntil: "networkidle" });
  const goalTrigger = page.getByTestId("stats-goal-open");
  await goalTrigger.click();
  await expectFocusContained(page, "stats-goal-dialog");
  await page.getByTestId("stats-goal-input").fill("0");
  await page.getByTestId("stats-goal-save").click();
  const goalError = page.getByTestId("stats-goal-error");
  await expect(goalError).toHaveRole("alert");
  await expect(goalError).toBeVisible();
  await expect(page.getByTestId("stats-goal-input")).toHaveAttribute("aria-describedby", "stats-goal-error");
  await capture(page, "stats-en-tablet-light-goal-alert.png");
  await page.keyboard.press("Escape");
  await page.bringToFront();
  await expect(goalTrigger).toBeFocused();

  const rangeTrigger = page.getByTestId("stats-period-custom");
  await rangeTrigger.click();
  await expectFocusContained(page, "stats-custom-range-dialog");
  await page.getByTestId("stats-custom-start").fill("2026-09-20");
  await page.getByTestId("stats-custom-end").fill("2026-09-01");
  await page.getByTestId("stats-custom-apply").click();
  await expect(page.getByTestId("stats-invalid-range")).toHaveRole("alert");
  await capture(page, "stats-en-tablet-light-custom-range-alert.png");
  await page.keyboard.press("Escape");
  await page.bringToFront();
  await expect(rangeTrigger).toBeFocused();
});

test("onboarding age policy returns focus after Escape", async ({ context, page }) => {
  await setFixture(context, "authenticated-not-found");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/en/onboarding", { waitUntil: "networkidle" });
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-next").click();
  const trigger = page.getByTestId("onboarding-start");
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "Age and advertising" })).toBeVisible();
  await expectFocusContained(page, "age-policy-backdrop");
  await capture(page, "onboarding-en-mobile-light-age-policy-focus.png");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Age and advertising" })).toHaveCount(0);
  await page.bringToFront();
  await expect(trigger).toBeFocused();
});

test("Korean Radix dialog close control has a localized accessible name", async ({ context, page }) => {
  await setFixture(context, "account-settings-happy");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/ko/account", { waitUntil: "networkidle" });
  const trigger = page.getByTestId("account-password-open");
  await trigger.click();
  const dialog = page.getByTestId("account-password-dialog");
  await expect(dialog).toHaveRole("dialog");
  await expect(dialog.getByRole("button", { name: "대화상자 닫기" })).toBeVisible();
  await capture(page, "account-ko-desktop-1280-dark-localized-close.png");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.bringToFront();
  await expect(trigger).toBeFocused();
});

test("record-detail and source-detail share the custom modal lifecycle", async ({ context, page }) => {
  await setFixture(context, "recall-happy");
  await page.goto("/en/library?mode=recall", { waitUntil: "networkidle" });
  await page.getByTestId("library-recall-input").fill("attention");
  await page.getByTestId("library-recall-submit").click();
  const trigger = page.getByTestId("recall-source-card").first();
  await trigger.click();
  const dialog = page.getByTestId("recall-source-detail");
  await expect(dialog).toHaveAttribute("data-surface", "record-detail");
  await expect(dialog.getByTestId("recall-source-detail-content")).toHaveAttribute("data-surface", "source-detail");
  await capture(page, "overlay-record-and-source-detail-focus.png");
  await expectModalLifecycle(page, dialog, trigger);
});

test("calendar-month-picker has a named custom modal lifecycle", async ({ context, page }) => {
  await setFixture(context, "calendar-happy");
  await page.goto("/en/calendar?year=2026&month=9", { waitUntil: "networkidle" });
  const trigger = page.getByTestId("calendar-month-button");
  await trigger.click();
  await expectModalLifecycle(page, page.getByTestId("calendar-month-picker"), trigger);
});

test("recommendation and mind-map details use the Radix modal lifecycle", async ({ context, page }) => {
  await setFixture(context, "ai-artifacts-happy");
  await page.goto("/en/books/00000000-0000-4000-8000-000000004421/mind-map", { waitUntil: "networkidle" });

  const clusterTrigger = page.getByTestId("mind-map-cluster-open").first();
  await clusterTrigger.click();
  await expectModalLifecycle(page, page.getByTestId("mind-map-cluster-detail"), clusterTrigger);

  const leafTrigger = page.getByTestId("ai-artifacts-mindmap-node").first();
  await leafTrigger.click();
  await expectModalLifecycle(page, page.getByTestId("mind-map-leaf-detail"), leafTrigger);

  await page.goto("/en/reading-insights#recommendations", { waitUntil: "networkidle" });
  const recommendationTrigger = page.getByTestId("ai-artifacts-recommendation").first();
  await recommendationTrigger.click();
  await capture(page, "overlay-ai-artifacts-focus.png");
  await expectModalLifecycle(page, page.getByTestId("recommendation-action"), recommendationTrigger);
});

test("review confirmation overlays use the Radix modal lifecycle", async ({ context, page }) => {
  await setFixture(context, "review-share-happy");
  await page.goto("/en/books/00000000-0000-4000-8000-000000004331/review", { waitUntil: "networkidle" });

  const exitTrigger = page.getByTestId("review-back");
  await page.getByTestId("review-short-text").fill("Keep this review draft.");
  await exitTrigger.click();
  await expectModalLifecycle(page, page.getByTestId("review-exit-confirmation"), exitTrigger);

  await page.getByTestId("review-ai-consent").check();
  await page.getByTestId("review-ai-generate").click();
  await expect(page.getByTestId("review-ai-draft")).toBeVisible();
  const replacementTrigger = page.getByTestId("review-ai-use-draft");
  await replacementTrigger.click();
  await expectModalLifecycle(page, page.getByTestId("review-ai-replacement-confirmation"), replacementTrigger);

  const saveTrigger = page.getByTestId("review-save");
  await saveTrigger.click();
  await capture(page, "overlay-review-save-complete-focus.png");
  await expectModalLifecycle(page, page.getByTestId("review-save-complete"), saveTrigger);
});

test("delete-account-confirmation uses the Radix modal lifecycle", async ({ context, page }) => {
  await setFixture(context, "account-deletion-cancel-or-retry");
  await page.goto("/en/account", { waitUntil: "networkidle" });
  const trigger = page.getByTestId("account-delete-open");
  await trigger.click();
  await capture(page, "overlay-delete-account-focus.png");
  await expectModalLifecycle(page, page.getByTestId("account-delete-dialog"), trigger);
});

test("schedule-change uses the Radix modal lifecycle", async ({ context, page }) => {
  await setFixture(context, "progress-forward");
  await page.goto("/en/reading/00000000-0000-4000-8000-000000004347", { waitUntil: "networkidle" });
  const trigger = page.getByTestId("schedule-change-open");
  await trigger.click();
  await capture(page, "overlay-schedule-change-focus.png");
  await expectModalLifecycle(page, page.getByTestId("schedule-change"), trigger);
});

test("review-link-editor uses the Radix modal lifecycle", async ({ context, page }) => {
  await setFixture(context, "review-share-happy");
  await page.goto("/en/books/00000000-0000-4000-8000-000000004331", { waitUntil: "networkidle" });
  const trigger = page.getByTestId("review-link-editor-open");
  await trigger.click();
  await capture(page, "overlay-review-link-editor-focus.png");
  await expectModalLifecycle(page, page.getByTestId("review-link-editor"), trigger);
});
