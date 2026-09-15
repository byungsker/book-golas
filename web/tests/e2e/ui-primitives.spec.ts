import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const evidenceDirectory = path.resolve(
  process.cwd(),
  "../.omo/evidence/bookgolas-web-app-parity",
);

const viewports = [
  { id: "mobile", width: 390, height: 844 },
  { id: "desktop", width: 1440, height: 900 },
] as const;

const themes = [
  { id: "dark", colorScheme: "dark" },
  { id: "light", colorScheme: "light" },
] as const;

const copy = {
  ko: {
    buttonPrimary: "기본 동작",
    buttonLoading: "저장 중",
    buttonActivated: "버튼을 눌렀습니다.",
    cardInteractive: "상호작용 카드",
    cardActivated: "카드를 열었습니다.",
    fieldLabel: "책 제목",
    pageLabel: "페이지",
    errorText: "총 페이지 수보다 작거나 같은 값을 입력하세요.",
    tabLabel: "독서 상태 탭",
    firstTab: "읽는 중",
    secondTab: "읽을 책",
    segmentLabel: "기록 필터",
    segmentSecond: "기록",
    pressable: "누를 수 있는 영역",
    pressableActivated: "영역을 눌렀습니다.",
    dismiss: "알림 닫기",
  },
  en: {
    buttonPrimary: "Primary action",
    buttonLoading: "Saving",
    buttonActivated: "Button activated.",
    cardInteractive: "Interactive card",
    cardActivated: "Card opened.",
    fieldLabel: "Book title",
    pageLabel: "Page",
    errorText: "Enter a value no greater than the total page count.",
    tabLabel: "Reading status tabs",
    firstTab: "Reading",
    secondTab: "To read",
    segmentLabel: "Record filter",
    segmentSecond: "Records",
    pressable: "Pressable region",
    pressableActivated: "Region activated.",
    retry: "Try again",
    retried: "Retry requested.",
    dismiss: "Dismiss notification",
    selected: "selected",
    boundaryActions: {
      "unauthorized-state": "Go to sign in",
      "consent-state": "Open consent settings",
      "quota-state": "View usage",
      "offline-state": "Reconnect",
    },
    boundaryOutcomes: {
      "unauthorized-state": "Sign in to view your library.",
      "consent-state": "Choose consent before using AI and notification features.",
      "quota-state": "You can use this feature again in the next period.",
      "offline-state": "Reconnect before trying to save again.",
    },
  },
} as const;

for (const locale of ["ko", "en"] as const) {
  for (const viewport of viewports) {
    for (const theme of themes) {
      test(`${locale} responsive BLab primitives at ${viewport.id} in ${theme.id} theme`, async ({ page }) => {
        const strings = copy[locale];
        fs.mkdirSync(evidenceDirectory, { recursive: true });
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.emulateMedia({ colorScheme: theme.colorScheme, reducedMotion: "reduce" });
        await page.goto(`/${locale}/ui-primitives`, { waitUntil: "networkidle" });

        await expect(page.getByTestId("ui-primitives-showcase")).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("data-blab-theme", theme.id);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);

        await expect(page.getByTestId("loading-state").locator(".blab-loading-state")).toHaveRole("status");
        await expect(page.getByTestId("empty-state").locator(".blab-empty-state")).toHaveRole("status");
        await expect(page.getByTestId("error-state").locator(".blab-error-state")).toHaveRole("alert");
        for (const state of ["unauthorized-state", "consent-state", "quota-state", "offline-state"]) {
          await expect(page.getByTestId(state)).toHaveRole("status");
        }

        const loadingButton = page.getByTestId("loading-button");
        await expect(loadingButton).toHaveAttribute("aria-busy", "true");
        await expect(loadingButton).toBeDisabled();
        await expect(page.getByTestId("primary-button")).toHaveAccessibleName(strings.buttonPrimary);
        await expect(page.getByTestId("interactive-card")).toHaveAccessibleName(strings.cardInteractive);
        await expect(page.getByRole("textbox", { name: strings.fieldLabel })).toHaveAccessibleName(strings.fieldLabel);
        await expect(page.getByRole("textbox", { name: strings.pageLabel })).toHaveAttribute("aria-invalid", "true");
        const describedBy = await page.getByRole("textbox", { name: strings.pageLabel }).getAttribute("aria-describedby");
        expect(describedBy).toBeTruthy();
        await expect(page.locator(`#${describedBy}`)).toHaveText(strings.errorText);

        if (locale === "ko" && viewport.id === "mobile" && theme.id === "dark") {
          await page.screenshot({
            path: path.join(evidenceDirectory, "task-9-bookgolas-web-app-parity.png"),
            fullPage: true,
          });
        }
        await page.screenshot({
          path: path.join(evidenceDirectory, `task-9-ui-primitives-${locale}-${viewport.id}-${theme.id}.png`),
          fullPage: true,
        });
      });
    }
  }
}

test("keyboard activation and focus contract", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/en/ui-primitives", { waitUntil: "networkidle" });

  const primaryButton = page.getByTestId("primary-button");
  await primaryButton.focus();
  await expect(primaryButton).toBeFocused();
  await expect(primaryButton).toHaveCSS("box-shadow", /.+/);
  await primaryButton.press("Enter");
  await expect(page.getByTestId("button-feedback")).toHaveText("Button activated.");

  const interactiveCard = page.getByTestId("interactive-card");
  await interactiveCard.focus();
  await expect(interactiveCard).toBeFocused();
  await interactiveCard.press("Space");
  await expect(page.getByTestId("card-feedback")).toHaveText("Card opened.");

  const tabList = page.getByRole("tablist", { name: "Reading status tabs" });
  const firstTab = tabList.getByRole("tab", { name: "Reading" });
  await firstTab.focus();
  await firstTab.press("ArrowRight");
  await expect(tabList.getByRole("tab", { name: "To read" })).toHaveAttribute("aria-selected", "true");

  const segmentedControl = page.getByRole("group", { name: "Record filter" });
  const allSegment = segmentedControl.getByRole("button", { name: "All" });
  await allSegment.focus();
  await allSegment.press("ArrowRight");
  await expect(segmentedControl.getByRole("button", { name: "Records" })).toHaveAttribute("aria-pressed", "true");

  const pressable = page.getByTestId("pressable").locator(".blab-pressable");
  await pressable.focus();
  await expect(pressable).toBeFocused();
  await pressable.press("Enter");
  await expect(page.getByTestId("pressable-feedback")).toHaveText("Region activated.");

  await page.getByTestId("error-state").getByRole("button", { name: copy.en.retry }).click();
  await expect(page.getByTestId("retry-feedback")).toHaveText(`${copy.en.retried} (1)`);

  for (const [state, action] of Object.entries(copy.en.boundaryActions)) {
    await page.getByTestId(state).getByRole("button", { name: action }).click();
    await expect(page.getByTestId(`${state}-feedback`)).toHaveText(`${action} · ${copy.en.boundaryOutcomes[state as keyof typeof copy.en.boundaryOutcomes]}`);
  }

  await page.screenshot({
    path: path.join(evidenceDirectory, "task-9-ui-primitives-en-action-feedback.png"),
    fullPage: true,
  });

  await page.getByTestId("snackbar").getByRole("button", { name: "Dismiss notification" }).click();
  await expect(page.getByTestId("snackbar")).toBeHidden();
});
