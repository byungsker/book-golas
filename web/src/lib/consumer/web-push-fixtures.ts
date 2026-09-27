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
import {
  consentRequiredError,
  failure,
  offlineError,
  providerError,
  quotaExceededError,
  success,
  unauthorizedError,
  unavailableError,
  validationError,
  type ProductError,
  type ProductResult,
} from "@/lib/product/dal/errors";

export const webPushFixtureUserId = "00000000-0000-0000-0000-000000000001";
export const webPushFixtureBookId = "00000000-0000-0000-0000-000000004451";

const defaultSettings: NotificationSettings = NotificationSettingsSchema.parse({
  notificationEnabled: true,
  dailyReminderEnabled: true,
  dailyReminderHour: 18,
  dailyReminderMinute: 0,
  goalAlarmEnabled: true,
  goalAlarmHour: 20,
  goalAlarmMinute: 0,
  eventNudgeEnabled: true,
  announcementsEnabled: true,
});

const fixtureSubscription = {
  endpoint: "https://push.example.invalid/send/web-push-fixture",
  expirationTime: null,
  keys: {
    p256dh: "fixture-p256dh-key",
    auth: "fixture-auth-key",
  },
} as const;

const responses = new Map<string, WebPushSettingsResponse>();

function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function errorFor(fixture: string): ProductError | null {
  if (fixture === "web-push-unauthorized") return unauthorizedError();
  if (fixture === "web-push-consent") return consentRequiredError("Notification consent is required.");
  if (fixture === "web-push-quota") return quotaExceededError("Notification registration is temporarily limited.");
  if (fixture === "web-push-offline") return offlineError("Notification settings are offline.");
  if (fixture === "web-push-error" || fixture === "web-push-network") return unavailableError("Notification settings are temporarily unavailable.");
  if (fixture === "web-push-provider") return providerError("The browser push provider is unavailable.");
  if (fixture === "web-push-foreign") return validationError("Ownership is derived from the authenticated session.");
  return null;
}

function capabilityFor(fixture: string): WebPushRegistrationStatus["capability"] {
  if (fixture === "web-push-unsupported") return "unsupported";
  if (fixture === "web-push-denied") return "denied";
  return "permission-required";
}

function statusFor(fixture: string, endpoint: string | null = null): WebPushRegistrationStatus {
  return WebPushRegistrationStatusSchema.parse({
    registered: endpoint !== null,
    deviceType: "web",
    endpoint,
    capability: endpoint ? "registered" : capabilityFor(fixture),
    delivery: "registration-only",
  });
}

function currentResponse(fixture: string): WebPushSettingsResponse {
  const existing = responses.get(fixture);
  if (existing) return copy(existing);
  const response = WebPushSettingsResponseSchema.parse({
    settings: defaultSettings,
    push: statusFor(fixture, fixture === "web-push-registered" ? fixtureSubscription.endpoint : null),
  });
  responses.set(fixture, response);
  return copy(response);
}

function settingsWithPatch(
  current: NotificationSettings,
  input: WebPushSettingsUpdateRequest,
): NotificationSettings {
  return NotificationSettingsSchema.parse({ ...current, ...input });
}

export function getWebPushSettingsFixture(
  fixture: string,
): ProductResult<WebPushSettingsResponse> {
  const error = errorFor(fixture);
  return error ? failure(error) : success(currentResponse(fixture));
}

export function updateWebPushSettingsFixture(
  fixture: string,
  input: WebPushSettingsUpdateRequest,
): ProductResult<WebPushSettingsResponse> {
  const parsedInput = WebPushSettingsUpdateRequestSchema.safeParse(input);
  if (!parsedInput.success) return failure(validationError("The Web notification settings are invalid."));
  const error = errorFor(fixture);
  if (error) return failure(error);
  if (fixture === "web-push-foreign") return failure(validationError("Ownership is derived from the authenticated session."));
  const current = currentResponse(fixture);
  const updated = WebPushSettingsResponseSchema.parse({
    ...current,
    settings: settingsWithPatch(current.settings, parsedInput.data),
  });
  responses.set(fixture, updated);
  return success(copy(updated));
}

export function registerWebPushSubscriptionFixture(
  fixture: string,
  input: WebPushRegistrationRequest,
): ProductResult<WebPushRegistrationResponse> {
  const parsedInput = WebPushRegistrationRequestSchema.safeParse(input);
  if (!parsedInput.success) return failure(validationError("The Web Push subscription is invalid."));
  const error = errorFor(fixture);
  if (error) return failure(error);
  const current = currentResponse(fixture);
  responses.set(fixture, WebPushSettingsResponseSchema.parse({
    ...current,
    push: statusFor(fixture, parsedInput.data.subscription.endpoint),
  }));
  return success(WebPushRegistrationResponseSchema.parse({
    kind: "web_push_registered",
    registered: true,
    deviceType: "web",
    endpoint: parsedInput.data.subscription.endpoint,
    delivery: "registration-only",
  }));
}

export function unregisterWebPushSubscriptionFixture(
  fixture: string,
): ProductResult<{ registered: false; deviceType: "web" }> {
  const error = errorFor(fixture);
  if (error) return failure(error);
  const current = currentResponse(fixture);
  responses.set(fixture, WebPushSettingsResponseSchema.parse({
    ...current,
    push: statusFor(fixture),
  }));
  return success({ registered: false, deviceType: "web" });
}

export function resetWebPushFixtures(): void {
  responses.clear();
}

export const webPushFixtureSubscription = fixtureSubscription;
