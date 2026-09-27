import { describe, expect, it } from "vitest";
import {
  WebPushRegistrationRequestSchema,
  WebPushRegistrationResponseSchema,
  WebPushSettingsResponseSchema,
  WebPushSubscriptionSchema,
} from "./web-push";

const subscription = {
  endpoint: "https://push.example.invalid/send/test",
  expirationTime: null,
  keys: { p256dh: "p256dh-key-value", auth: "auth-key-value" },
};

const settings = {
  notificationEnabled: true,
  dailyReminderEnabled: true,
  dailyReminderHour: 18,
  dailyReminderMinute: 0,
  goalAlarmEnabled: true,
  goalAlarmHour: 20,
  goalAlarmMinute: 0,
  eventNudgeEnabled: true,
  announcementsEnabled: true,
};

describe("Web Push contracts", () => {
  it("accepts a strict browser subscription and registration response", () => {
    expect(WebPushRegistrationRequestSchema.parse({ subscription, locale: "en" }).subscription.endpoint).toContain("push.example");
    expect(WebPushRegistrationResponseSchema.parse({ kind: "web_push_registered", registered: true, deviceType: "web", endpoint: subscription.endpoint, delivery: "registration-only" }).delivery).toBe("registration-only");
  });

  it("rejects caller identity, secrets in the shape and unsafe endpoints", () => {
    expect(WebPushSubscriptionSchema.safeParse({ ...subscription, user_id: "foreign" }).success).toBe(false);
    expect(WebPushRegistrationRequestSchema.safeParse({ subscription, locale: "en", userId: "foreign" }).success).toBe(false);
    expect(WebPushSubscriptionSchema.safeParse({ ...subscription, endpoint: "http://push.example.invalid/send/test" }).success).toBe(false);
    expect(WebPushSettingsResponseSchema.safeParse({ settings, push: { registered: false, deviceType: "web", endpoint: null, capability: "permission-required", delivery: "registration-only" }, extra: true }).success).toBe(false);
  });
});
