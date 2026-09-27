import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const evidenceDirectory = path.resolve(process.env.BOOKGOLAS_EVIDENCE_DIR ?? path.resolve(process.cwd(), "../.omo/evidence/bookgolas-web-app-parity"));
const fixtureSubscription = {
  endpoint: "https://push.example.invalid/send/web-push-fixture",
  expirationTime: null,
  keys: { p256dh: "fixture-p256dh-key", auth: "fixture-auth-key" },
};
const negativeFixtureRoutes = [
  "web-push-denied",
  "web-push-unsupported",
  "web-push-foreign",
  "web-push-offline",
  "web-push-consent",
  "web-push-quota",
  "web-push-provider",
  "web-push-network",
  "web-push-unauthorized",
];

async function setFixture(context: BrowserContext, value: string) {
  await context.addCookies([
    { name: "bookgolas-route-fixture", value, domain: "127.0.0.1", path: "/" },
    { name: "bookgolas-route-fixture", value, domain: "localhost", path: "/" },
  ]);
}

async function installSupportedPushMocks(page: Page) {
  await page.addInitScript(() => {
    let permission: NotificationPermission = "default";
    const subscription = {
      endpoint: "https://push.example.invalid/send/web-push-fixture",
      expirationTime: null,
      toJSON: () => ({ endpoint: "https://push.example.invalid/send/web-push-fixture", expirationTime: null, keys: { p256dh: "fixture-p256dh-key", auth: "fixture-auth-key" } }),
      unsubscribe: async () => true,
    };
    const registration = {
      pushManager: {
        getSubscription: async () => permission === "granted" ? subscription : null,
        subscribe: async () => subscription,
      },
    };
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(window, "Notification", { configurable: true, value: { get permission() { return permission; }, requestPermission: async () => { permission = "granted"; return permission; } } });
    Object.defineProperty(window, "PushManager", { configurable: true, value: function PushManager() {} });
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { register: async () => registration, getRegistration: async () => registration } });
  });
}

async function installDeniedPushMock(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(window, "Notification", { configurable: true, value: { permission: "denied", requestPermission: async () => "denied" } });
    Object.defineProperty(window, "PushManager", { configurable: true, value: function PushManager() {} });
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { register: async () => { throw new Error("permission denied"); }, getRegistration: async () => null } });
  });
}

async function capture(page: Page, name: string) {
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDirectory, name), fullPage: true });
}

test("permission settings and deep-link registration", async ({ context, page }) => {
  await setFixture(context, "web-push-happy");
  await installSupportedPushMocks(page);
  await page.goto("/en/account/notifications", { waitUntil: "networkidle" });

  await expect(page.getByTestId("web-push-settings")).toHaveAttribute("data-push-state", "permission-required");
  await expect(page.getByTestId("web-push-enable")).toBeVisible();
  await page.getByTestId("web-push-enable").click();
  await expect(page.getByTestId("web-push-settings")).toHaveAttribute("data-push-state", "ready");
  await expect(page.getByTestId("web-push-settings")).toHaveAttribute("data-push-registered", "true");
  await expect(page.getByTestId("web-push-settings")).toHaveAttribute("data-push-delivery", "registration-only");
  await expect(page.getByTestId("web-push-delivery-note")).toContainText("not verified");

  await page.getByTestId("web-push-daily-enabled").click();
  await expect(page.getByTestId("web-push-saved")).toBeVisible();
  await expect.poll(async () => (await page.request.get("/api/consumer/notifications")).json()).toMatchObject({ settings: { dailyReminderEnabled: false } });

  const serviceWorker = await (await page.request.get("/push-sw.js")).text();
  expect(serviceWorker).toContain("notificationclick");
  expect(serviceWorker).toContain("/books/");
  expect(serviceWorker).toContain("openWindow");
  expect(serviceWorker).toContain("bookId");
  expect(serviceWorker).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|FCM_SERVER_KEY|service_role|privateKey/);
  expect(await page.content()).not.toMatch(/fixture-p256dh-key|fixture-auth-key|SUPABASE_SERVICE_ROLE_KEY|FCM_SERVER_KEY/);
  await expect(page.locator("body")).not.toContainText(/purchase|restore|upgrade|customer center/i);
  await capture(page, "capability-native-push-registration-only.png");
  await capture(page, "task-32-bookgolas-web-app-parity.png");
});

test("notification times persist for the authenticated owner", async ({ context, page }) => {
  await setFixture(context, "web-push-happy");
  await installSupportedPushMocks(page);
  await page.goto("/en/account/notifications", { waitUntil: "networkidle" });

  await page.getByTestId("web-push-daily-time").selectOption("7:30");
  await expect.poll(async () => (await page.request.get("/api/consumer/notifications")).json()).toMatchObject({ settings: { dailyReminderHour: 7, dailyReminderMinute: 30 } });
  await page.getByTestId("web-push-goal-time").selectOption("21:30");
  await expect.poll(async () => (await page.request.get("/api/consumer/notifications")).json()).toMatchObject({ settings: { goalAlarmHour: 21, goalAlarmMinute: 30 } });
  await capture(page, "overlay-notification-time-picker.png");
});

test("denied browser state remains recoverable", async ({ context, page }) => {
  await setFixture(context, "web-push-denied");
  await installDeniedPushMock(page);
  await page.goto("/ko/account/notifications", { waitUntil: "networkidle" });
  await expect(page.getByTestId("web-push-settings")).toHaveAttribute("data-push-state", "denied");
  await expect(page.getByTestId("web-push-denied")).toBeVisible();
  await expect(page.getByTestId("web-push-enable")).toHaveCount(0);
  await capture(page, "capability-native-push-denied-recovery.png");
});

test("unsupported browser keeps the in-app fallback", async ({ context, page }) => {
  await setFixture(context, "web-push-unsupported");
  await page.goto("/en/account/notifications", { waitUntil: "networkidle" });
  await expect(page.getByTestId("web-push-settings")).toHaveAttribute("data-push-state", "unsupported");
  await expect(page.getByTestId("web-push-unsupported")).toBeVisible();
  await expect(page.getByTestId("web-push-account-link")).toBeVisible();
});

test("foreign subscription payload is rejected", async ({ context, page }) => {
  await setFixture(context, "web-push-foreign");
  await page.goto("/en/account/notifications", { waitUntil: "networkidle" });
  expect(negativeFixtureRoutes).toEqual(expect.arrayContaining(["web-push-foreign", "web-push-offline", "web-push-consent", "web-push-quota", "web-push-provider", "web-push-network", "web-push-unauthorized"]));
  const foreign = await page.request.post("/api/consumer/push", { data: { subscription: fixtureSubscription, locale: "en", user_id: "foreign-user" } });
  expect(foreign.status()).toBe(400);
  expect((await foreign.json()).error.code).toBe("validation_error");
  const noIdentity = await page.request.post("/api/consumer/push", { data: { subscription: fixtureSubscription, locale: "en" } });
  expect(noIdentity.status()).toBe(400);
  expect((await noIdentity.json()).error.code).toBe("validation_error");
  expect(await page.content()).not.toContain("foreign-user");
});

test("offline consent quota provider network foreign and unauthorized states remain explicit", async ({ context, page }) => {
  const cases = [
    ["web-push-offline", "offline"],
    ["web-push-consent", "consent"],
    ["web-push-quota", "quota"],
    ["web-push-provider", "error"],
    ["web-push-network", "error"],
    ["web-push-foreign", "error"],
    ["web-push-unauthorized", "unauthorized"],
  ] as const;

  for (const [fixture, state] of cases) {
    await setFixture(context, fixture);
    await page.goto("/en/account/notifications", { waitUntil: "networkidle" });
    await expect(page.getByTestId("web-push-settings")).toHaveAttribute("data-push-state", state);
    await expect(page.getByTestId("web-push-retry")).toBeVisible();
  }
  await capture(page, "capability-native-push-boundary-states.png");
});
