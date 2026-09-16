import { describe, expect, it, vi } from "vitest";
import {
  readOwnedWebPushSettings,
  registerOwnedWebPushSubscription,
  unregisterOwnedWebPushSubscription,
  updateOwnedWebPushSettings,
} from "./dal";

vi.mock("server-only", () => ({}));

const userId = "20000000-0000-4000-8000-000000000002";
const subscription = {
  endpoint: "https://push.example.invalid/send/test",
  expirationTime: null,
  keys: { p256dh: "p256dh-key-value", auth: "auth-key-value" },
};

function settingsRow(overrides: Record<string, unknown> = {}) {
  return {
    notification_enabled: true,
    daily_reminder_enabled: true,
    daily_reminder_hour: 18,
    daily_reminder_minute: 0,
    goal_alarm_enabled: true,
    goal_alarm_hour: 20,
    goal_alarm_minute: 0,
    event_nudge_enabled: true,
    announcements_enabled: true,
    ...overrides,
  };
}

function query(response: { data: unknown; error: unknown } = { data: null, error: null }) {
  const value = {
    select: vi.fn(() => value),
    eq: vi.fn(() => value),
    update: vi.fn(() => value),
    insert: vi.fn(() => value),
    upsert: vi.fn(() => value),
    delete: vi.fn(() => value),
    maybeSingle: vi.fn().mockResolvedValue(response),
    then: (resolve: (result: unknown) => unknown) => Promise.resolve(response).then(resolve),
  };
  return value;
}

function factoryFor(queries: Record<string, ReturnType<typeof query>>) {
  const supabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }) },
    from: vi.fn((table: string) => queries[table]),
  };
  return { supabase, factory: () => Promise.resolve(supabase as never) };
}

describe("Web Push owner-scoped DAL", () => {
  it("reads only the verified user's web subscription and settings", async () => {
    const subscriptionQuery = query({ data: { device_type: "web", endpoint: subscription.endpoint }, error: null });
    const settingsQuery = query({ data: settingsRow(), error: null });
    const { factory } = factoryFor({ web_push_subscriptions: subscriptionQuery, web_notification_settings: settingsQuery });
    const result = await readOwnedWebPushSettings(factory);
    expect(result).toMatchObject({ ok: true, value: { push: { registered: true, endpoint: subscription.endpoint }, settings: { dailyReminderHour: 18 } } });
    expect(subscriptionQuery.eq).toHaveBeenCalledWith("user_id", userId);
    expect(subscriptionQuery.eq).toHaveBeenCalledWith("device_type", "web");
    expect(settingsQuery.eq).toHaveBeenCalledWith("user_id", userId);
  });

  it("derives the owner for registration and never returns subscription keys", async () => {
    const subscriptionQuery = query({ data: { device_type: "web", endpoint: subscription.endpoint }, error: null });
    const settingsQuery = query({ data: settingsRow(), error: null });
    const { factory } = factoryFor({ web_push_subscriptions: subscriptionQuery, web_notification_settings: settingsQuery });
    const result = await registerOwnedWebPushSubscription({ subscription, locale: "en" }, factory);
    expect(result).toMatchObject({ ok: true, value: { registered: true, endpoint: subscription.endpoint, delivery: "registration-only" } });
    expect(subscriptionQuery.upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: userId, device_type: "web", p256dh: subscription.keys.p256dh, auth: subscription.keys.auth }), { onConflict: "user_id,device_type" });
    if (result.ok) expect(result.value).not.toHaveProperty("keys");
  });

  it("updates preference rows and deletes only the verified web subscription", async () => {
    const subscriptionQuery = query({ data: { device_type: "web", endpoint: subscription.endpoint }, error: null });
    const settingsQuery = query({ data: { user_id: userId }, error: null });
    settingsQuery.maybeSingle.mockResolvedValueOnce({ data: { user_id: userId }, error: null }).mockResolvedValueOnce({ data: settingsRow({ daily_reminder_enabled: false }), error: null });
    const { factory } = factoryFor({ web_push_subscriptions: subscriptionQuery, web_notification_settings: settingsQuery });
    const updated = await updateOwnedWebPushSettings({ dailyReminderEnabled: false }, factory);
    expect(updated).toMatchObject({ ok: true, value: { settings: { dailyReminderEnabled: false } } });
    expect(settingsQuery.update).toHaveBeenCalledWith(expect.objectContaining({ daily_reminder_enabled: false }));
    expect(settingsQuery.eq).toHaveBeenCalledWith("user_id", userId);
    const deleted = await unregisterOwnedWebPushSubscription(factory);
    expect(deleted).toEqual({ ok: true, value: { registered: false, deviceType: "web" } });
    expect(subscriptionQuery.delete).toHaveBeenCalled();
    expect(subscriptionQuery.eq).toHaveBeenCalledWith("user_id", userId);
    expect(subscriptionQuery.eq).toHaveBeenCalledWith("device_type", "web");
  });
});
