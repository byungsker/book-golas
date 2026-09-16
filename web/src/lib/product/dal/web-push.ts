import "server-only";

import {
  NotificationSettingsSchema,
  WebPushRegistrationRequestSchema,
  WebPushRegistrationResponseSchema,
  WebPushRegistrationStatusSchema,
  WebPushSettingsResponseSchema,
  WebPushSettingsUpdateRequestSchema,
  type NotificationSettings,
  type WebPushRegistrationRequest,
  type WebPushRegistrationResponse,
  type WebPushRegistrationStatus,
  type WebPushSettingsResponse,
  type WebPushSettingsUpdateRequest,
} from "@/lib/product/contracts";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  failure,
  mapDatabaseError,
  success,
  unavailableError,
  validationError,
  type ProductResult,
} from "./errors";
import { resolveProductSession, type ProductClientFactory } from "./context";

export const webPushSubscriptionColumns = "device_type,endpoint";
export const webNotificationSettingsColumns = "notification_enabled,daily_reminder_enabled,daily_reminder_hour,daily_reminder_minute,goal_alarm_enabled,goal_alarm_hour,goal_alarm_minute,event_nudge_enabled,announcements_enabled";

const defaultNotificationSettings: NotificationSettings = {
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

type Row = Record<string, unknown>;

function isRow(value: unknown): value is Row {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSettings(row: unknown): ProductResult<NotificationSettings> {
  if (!isRow(row)) return success(defaultNotificationSettings);
  const parsed = NotificationSettingsSchema.safeParse({
    notificationEnabled: row.notification_enabled ?? defaultNotificationSettings.notificationEnabled,
    dailyReminderEnabled: row.daily_reminder_enabled ?? defaultNotificationSettings.dailyReminderEnabled,
    dailyReminderHour: row.daily_reminder_hour ?? defaultNotificationSettings.dailyReminderHour,
    dailyReminderMinute: row.daily_reminder_minute ?? defaultNotificationSettings.dailyReminderMinute,
    goalAlarmEnabled: row.goal_alarm_enabled ?? defaultNotificationSettings.goalAlarmEnabled,
    goalAlarmHour: row.goal_alarm_hour ?? defaultNotificationSettings.goalAlarmHour,
    goalAlarmMinute: row.goal_alarm_minute ?? defaultNotificationSettings.goalAlarmMinute,
    eventNudgeEnabled: row.event_nudge_enabled ?? defaultNotificationSettings.eventNudgeEnabled,
    announcementsEnabled: row.announcements_enabled ?? defaultNotificationSettings.announcementsEnabled,
  });
  return parsed.success
    ? success(parsed.data)
    : failure(unavailableError("Web notification settings are malformed."));
}

function parseStatus(row: unknown): ProductResult<WebPushRegistrationStatus> {
  const endpoint = isRow(row) && typeof row.endpoint === "string" ? row.endpoint : null;
  const parsed = WebPushRegistrationStatusSchema.safeParse({
    registered: endpoint !== null,
    deviceType: "web",
    endpoint,
    capability: endpoint ? "registered" : "permission-required",
    delivery: "registration-only",
  });
  return parsed.success
    ? success(parsed.data)
    : failure(unavailableError("Web Push registration is malformed."));
}

function settingsResponse(
  settings: NotificationSettings,
  push: WebPushRegistrationStatus,
): ProductResult<WebPushSettingsResponse> {
  const parsed = WebPushSettingsResponseSchema.safeParse({ settings, push });
  return parsed.success
    ? success(parsed.data)
    : failure(unavailableError("Web Push settings are invalid."));
}

export async function readOwnedWebPushSettings(
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<WebPushSettingsResponse>> {
  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);

  try {
    const subscriptionResult = await session.value.supabase
      .from("web_push_subscriptions")
      .select(webPushSubscriptionColumns)
      .eq("user_id", session.value.userId)
      .eq("device_type", "web")
      .maybeSingle();
    if (subscriptionResult.error) return failure(mapDatabaseError(subscriptionResult.error));

    const settingsResult = await session.value.supabase
      .from("web_notification_settings")
      .select(webNotificationSettingsColumns)
      .eq("user_id", session.value.userId)
      .maybeSingle();
    if (settingsResult.error) return failure(mapDatabaseError(settingsResult.error));

    const settings = parseSettings(settingsResult.data);
    if (!settings.ok) return failure(settings.error);
    const push = parseStatus(subscriptionResult.data);
    if (!push.ok) return failure(push.error);
    return settingsResponse(settings.value, push.value);
  } catch (error) {
    return failure(mapDatabaseError(error));
  }
}

export async function updateOwnedWebPushSettings(
  input: WebPushSettingsUpdateRequest,
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<WebPushSettingsResponse>> {
  const parsedInput = WebPushSettingsUpdateRequestSchema.safeParse(input);
  if (!parsedInput.success) return failure(validationError("The Web notification settings are invalid."));

  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);

  const row = {
    notification_enabled: parsedInput.data.notificationEnabled,
    daily_reminder_enabled: parsedInput.data.dailyReminderEnabled,
    daily_reminder_hour: parsedInput.data.dailyReminderHour,
    daily_reminder_minute: parsedInput.data.dailyReminderMinute,
    goal_alarm_enabled: parsedInput.data.goalAlarmEnabled,
    goal_alarm_hour: parsedInput.data.goalAlarmHour,
    goal_alarm_minute: parsedInput.data.goalAlarmMinute,
    event_nudge_enabled: parsedInput.data.eventNudgeEnabled,
    announcements_enabled: parsedInput.data.announcementsEnabled,
  };
  const values = Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));

  try {
    const current = await session.value.supabase
      .from("web_notification_settings")
      .select("user_id")
      .eq("user_id", session.value.userId)
      .maybeSingle();
    if (current.error) return failure(mapDatabaseError(current.error));

    const result = current.data
      ? await session.value.supabase
        .from("web_notification_settings")
        .update(values)
        .eq("user_id", session.value.userId)
        .select(webNotificationSettingsColumns)
        .maybeSingle()
      : await session.value.supabase
        .from("web_notification_settings")
        .insert({ user_id: session.value.userId, ...defaultSettingsRow(), ...values })
        .select(webNotificationSettingsColumns)
        .maybeSingle();
    if (result.error) return failure(mapDatabaseError(result.error));
    const settings = parseSettings(result.data);
    if (!settings.ok) return failure(settings.error);

    const subscription = await session.value.supabase
      .from("web_push_subscriptions")
      .select(webPushSubscriptionColumns)
      .eq("user_id", session.value.userId)
      .eq("device_type", "web")
      .maybeSingle();
    if (subscription.error) return failure(mapDatabaseError(subscription.error));
    const push = parseStatus(subscription.data);
    if (!push.ok) return failure(push.error);
    return settingsResponse(settings.value, push.value);
  } catch (error) {
    return failure(mapDatabaseError(error));
  }
}

function defaultSettingsRow() {
  return {
    notification_enabled: defaultNotificationSettings.notificationEnabled,
    daily_reminder_enabled: defaultNotificationSettings.dailyReminderEnabled,
    daily_reminder_hour: defaultNotificationSettings.dailyReminderHour,
    daily_reminder_minute: defaultNotificationSettings.dailyReminderMinute,
    goal_alarm_enabled: defaultNotificationSettings.goalAlarmEnabled,
    goal_alarm_hour: defaultNotificationSettings.goalAlarmHour,
    goal_alarm_minute: defaultNotificationSettings.goalAlarmMinute,
    event_nudge_enabled: defaultNotificationSettings.eventNudgeEnabled,
    announcements_enabled: defaultNotificationSettings.announcementsEnabled,
  };
}

export async function registerOwnedWebPushSubscription(
  input: WebPushRegistrationRequest,
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<WebPushRegistrationResponse>> {
  const parsedInput = WebPushRegistrationRequestSchema.safeParse(input);
  if (!parsedInput.success) return failure(validationError("The Web Push subscription is invalid."));

  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);

  try {
    const { data, error } = await session.value.supabase
      .from("web_push_subscriptions")
      .upsert({
        user_id: session.value.userId,
        device_type: "web",
        endpoint: parsedInput.data.subscription.endpoint,
        p256dh: parsedInput.data.subscription.keys.p256dh,
        auth: parsedInput.data.subscription.keys.auth,
        expiration_time: parsedInput.data.subscription.expirationTime ?? null,
      }, { onConflict: "user_id,device_type" })
      .select(webPushSubscriptionColumns)
      .maybeSingle();
    if (error) return failure(mapDatabaseError(error));
    const status = parseStatus(data);
    if (!status.ok || !status.value.registered || !status.value.endpoint) {
      return failure(unavailableError("The Web Push subscription was not saved."));
    }
    const response = WebPushRegistrationResponseSchema.safeParse({
      kind: "web_push_registered",
      registered: true,
      deviceType: "web",
      endpoint: status.value.endpoint,
      delivery: "registration-only",
    });
    return response.success
      ? success(response.data)
      : failure(unavailableError("The Web Push registration response is invalid."));
  } catch (error) {
    return failure(mapDatabaseError(error));
  }
}

export async function unregisterOwnedWebPushSubscription(
  factory: ProductClientFactory = createServerSupabaseClient,
): Promise<ProductResult<{ registered: false; deviceType: "web" }>> {
  const session = await resolveProductSession(factory);
  if (!session.ok) return failure(session.error);

  try {
    const { error } = await session.value.supabase
      .from("web_push_subscriptions")
      .delete()
      .eq("user_id", session.value.userId)
      .eq("device_type", "web");
    if (error) return failure(mapDatabaseError(error));
    return success({ registered: false, deviceType: "web" });
  } catch (error) {
    return failure(mapDatabaseError(error));
  }
}
