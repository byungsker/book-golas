import { test, expect } from "@playwright/test"

test("public legal route renders content", async ({ page }) => {
  const response = await page.goto("/privacy")

  expect(response).not.toBeNull()
  expect(response?.ok()).toBe(true)
  await expect(page.locator("body")).not.toBeEmpty()
})
