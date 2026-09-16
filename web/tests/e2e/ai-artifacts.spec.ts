import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const evidenceDirectory = path.resolve(process.cwd(), "../.omo/evidence/bookgolas-web-app-parity");
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
  await capture(page, "task-30-bookgolas-web-app-parity.png");
});

test("reading insights renders localized insight cards", async ({ context, page }) => {
  await setFixture(context, "ai-artifacts-happy");
  await page.goto("/ko/reading-insights", { waitUntil: "networkidle" });
  await expect(page.getByTestId("ai-artifacts-insights")).toHaveAttribute("data-ai-artifact-state", "fresh");
  await expect(page.getByTestId("ai-artifacts-insight")).toContainText("steadier");
});

test("recommendation screen opens the browser action dialog", async ({ context, page }) => {
  await setFixture(context, "ai-artifacts-happy");
  await page.goto("/en/book-list", { waitUntil: "networkidle" });
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
  await page.goto("/en/book-list", { waitUntil: "networkidle" });
  await expect(page.getByTestId("ai-artifacts-recommendations")).toHaveAttribute("data-ai-artifact-state", "success");
  await expect(page.getByTestId("ai-artifacts-recommendation")).toBeVisible();
});

test("rate-limit and provider states remain visible", async ({ context, page }) => {
  await setFixture(context, "ai-artifacts-rate-limit");
  await page.goto("/en/reading-insights", { waitUntil: "networkidle" });
  await expect(page.getByTestId("ai-artifacts-insights")).toHaveAttribute("data-ai-artifact-state", "rate_limit_exceeded");

  await setFixture(context, "ai-artifacts-provider");
  await page.goto("/en/book-list", { waitUntil: "networkidle" });
  await expect(page.getByTestId("ai-artifacts-recommendations")).toHaveAttribute("data-ai-artifact-state", "provider_error");
});

test("empty, source-change, consent, quota and offline fixtures stay distinct", async ({ context, page }) => {
  await setFixture(context, "ai-artifacts-empty");
  await page.goto("/en/book-list", { waitUntil: "networkidle" });
  await expect(page.getByTestId("ai-artifacts-recommendations")).toHaveAttribute("data-ai-artifact-state", "empty");

  await setFixture(context, "ai-artifacts-source-changed");
  await page.goto("/en/book-list", { waitUntil: "networkidle" });
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
