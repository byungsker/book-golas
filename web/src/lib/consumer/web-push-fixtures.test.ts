import { beforeEach, describe, expect, it } from "vitest";
import {
  getWebPushSettingsFixture,
  registerWebPushSubscriptionFixture,
  resetWebPushFixtures,
  updateWebPushSettingsFixture,
  webPushFixtureSubscription,
} from "./web-push-fixtures";

describe("Web Push fixtures", () => {
  beforeEach(() => resetWebPushFixtures());

  it("registers one web subscription and persists settings for the fixture user", () => {
    const registered = registerWebPushSubscriptionFixture("web-push-happy", {
      subscription: webPushFixtureSubscription,
      locale: "en",
    });
    expect(registered).toMatchObject({ ok: true, value: { deviceType: "web", registered: true } });
    const updated = updateWebPushSettingsFixture("web-push-happy", { dailyReminderEnabled: false, dailyReminderHour: 19 });
    expect(updated).toMatchObject({ ok: true, value: { settings: { dailyReminderEnabled: false, dailyReminderHour: 19 }, push: { registered: true } } });
    expect(getWebPushSettingsFixture("web-push-happy")).toMatchObject({ ok: true, value: { settings: { dailyReminderEnabled: false } } });
  });

  it("keeps denial, unsupported and foreign cases explicit", () => {
    expect(getWebPushSettingsFixture("web-push-denied")).toMatchObject({ ok: true, value: { push: { capability: "denied" } } });
    expect(getWebPushSettingsFixture("web-push-unsupported")).toMatchObject({ ok: true, value: { push: { capability: "unsupported" } } });
    expect(registerWebPushSubscriptionFixture("web-push-foreign", { subscription: webPushFixtureSubscription, locale: "ko" })).toMatchObject({ ok: false, error: { code: "validation_error" } });
  });
});
