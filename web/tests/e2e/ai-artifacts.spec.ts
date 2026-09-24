import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const evidenceDirectory = path.resolve(process.cwd(), "../.omo/evidence/bookgolas-web-completion");
const bookId = "00000000-0000-4000-8000-000000004421";

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

test("mindmap renders the owned note structure and connections", async ({ context, page }) => {
  await setFixture(context, "ai-artifacts-happy");
  await page.goto(`/en/books/${bookId}/mind-map`, { waitUntil: "networkidle" });
  await expect(page.getByTestId("ai-artifacts-mindmap")).toHaveAttribute("data-ai-artifact-state", "fresh");
  await expect(page.getByTestId("ai-artifacts-mindmap-cluster")).toBeVisible();
  await expect(page.getByTestId("ai-artifacts-mindmap-connections")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/purchase|subscribe|upgrade/i);
  await capture(page, "task-8-ai-artifacts-mindmap.png");
});

test("reading insights renders localized insight cards", async ({ context, page }) => {
  await setFixture(context, "ai-artifacts-happy");
  await page.goto("/ko/reading-insights", { waitUntil: "networkidle" });
  await expect(page.getByTestId("ai-artifacts-insights")).toHaveAttribute("data-ai-artifact-state", "fresh");
  await expect(page.getByTestId("ai-artifacts-insight")).toContainText("steadier");
});

test("recommendation screen opens the browser action dialog", async ({ context, page }) => {
  await setFixture(context, "ai-artifacts-happy");
  await page.goto("/en/reading-insights#recommendations", { waitUntil: "networkidle" });
  await expect(page.getByTestId("ai-artifacts-recommendations")).toHaveAttribute("data-ai-artifact-state", "fresh");
  await page.getByTestId("ai-artifacts-recommendation").click();
  await expect(page.getByRole("dialog")).toContainText("The Reading Atlas");
  await expect(page.getByRole("dialog")).toContainText("Start reading");
});

test("missing and expired caches regenerate once per request", async ({ context, page }) => {
  await setFixture(context, "ai-artifacts-missing");
  await page.goto("/en/reading-insights", { waitUntil: "networkidle" });
  await expect(page.getByTestId("ai-artifacts-insights")).toHaveAttribute("data-ai-artifact-state", "success");
  await expect(page.getByTestId("ai-artifacts-insight")).toBeVisible();

  await setFixture(context, "ai-artifacts-expired");
  await page.goto("/en/reading-insights#recommendations", { waitUntil: "networkidle" });
  await expect(page.getByTestId("ai-artifacts-recommendations")).toHaveAttribute("data-ai-artifact-state", "success");
  await expect(page.getByTestId("ai-artifacts-recommendation")).toBeVisible();
});

test("provider policy failures stay distinct and block dispatch", async ({ context, page, request }) => {
  const cases = [
    ["ai-artifacts-consent", "consent_required"],
    ["ai-artifacts-consent-withdrawn", "consent_required"],
    ["ai-artifacts-consent-unknown", "unknown"],
    ["ai-artifacts-consent-unavailable", "unavailable"],
    ["ai-artifacts-rate-limit", "rate_limit_exceeded"],
    ["ai-artifacts-quota", "quota_exceeded"],
    ["ai-artifacts-concurrency", "concurrency_exceeded"],
    ["ai-artifacts-budget", "budget_exceeded"],
    ["ai-artifacts-hard-cap", "hard_cap_exceeded"],
    ["ai-artifacts-timeout", "provider_timeout"],
    ["ai-artifacts-provider", "provider_error"],
    ["ai-artifacts-offline", "offline"],
  ] as const;

  for (const [fixture, state] of cases) {
    const response = await request.post("/api/consumer/ai-artifacts", {
      headers: { Cookie: `bookgolas-route-fixture=${fixture}` },
      data: { kind: "insights", locale: "en", requestKey: "00000000-0000-4000-8000-000000008001" },
    });
    expect(response.headers()["x-bookgolas-provider-calls"]).toBe("0");
    await setFixture(context, fixture);
    await page.goto("/en/reading-insights", { waitUntil: "networkidle" });
    await expect(page.getByTestId("ai-artifacts-insights")).toHaveAttribute("data-ai-artifact-state", state);
    await expect(page.locator("body")).not.toContainText(/billing|upgrade|purchase|subscribe|subscription|paywall/i);
  }
  await capture(page, "task-8-ai-artifacts-fail-closed.png");

  await setFixture(context, "ai-artifacts-hard-cap");
  await page.goto("/ko/reading-insights", { waitUntil: "networkidle" });
  await expect(page.getByTestId("ai-artifacts-insights")).toHaveAttribute("data-ai-artifact-state", "hard_cap_exceeded");
  await expect(page.getByTestId("ai-artifacts-insights")).toContainText("AI 안전 한도에 도달했어요");
  await capture(page, "task-8-ai-artifacts-fail-closed-ko.png");
});

test("empty, source-change, consent, quota and offline fixtures stay distinct", async ({ context, page }) => {
  await setFixture(context, "ai-artifacts-empty");
  await page.goto("/en/reading-insights#recommendations", { waitUntil: "networkidle" });
  await expect(page.getByTestId("ai-artifacts-recommendations")).toHaveAttribute("data-ai-artifact-state", "empty");

  await setFixture(context, "ai-artifacts-source-changed");
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("ai-artifacts-recommendations")).toHaveAttribute("data-ai-artifact-state", "success");

  for (const fixture of ["ai-artifacts-consent", "ai-artifacts-quota", "ai-artifacts-offline"] as const) {
    await setFixture(context, fixture);
    await page.goto("/en/reading-insights", { waitUntil: "networkidle" });
    await expect(page.getByTestId("ai-artifacts-insights")).toHaveAttribute(
      "data-ai-artifact-state",
      fixture === "ai-artifacts-consent" ? "consent_required" : fixture === "ai-artifacts-quota" ? "quota_exceeded" : "offline",
    );
  }
});

test("foreign and unauthorized artifacts fail closed", async ({ context, page, request }) => {
  await setFixture(context, "ai-artifacts-foreign");
  await page.goto("/en/reading-insights", { waitUntil: "networkidle" });
  await expect(page.getByTestId("ai-artifacts-insights")).toHaveAttribute("data-ai-artifact-state", "error");
  await expect(page.locator("body")).not.toContainText(/A private|Foreign|User A|foreign-user-id/i);

  const foreignResponse = await request.get(`/api/consumer/ai-artifacts?kind=mindmap&locale=en&bookId=${bookId}`, {
    headers: { Cookie: "bookgolas-route-fixture=ai-artifacts-foreign" },
  });
  expect(foreignResponse.status()).toBe(404);

  await setFixture(context, "ai-artifacts-unauthorized");
  await page.goto("/en/reading-insights", { waitUntil: "networkidle" });
  await expect(page.getByTestId("ai-artifacts-insights")).toHaveAttribute("data-ai-artifact-state", "unauthorized");
});
