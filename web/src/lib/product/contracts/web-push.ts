import { z } from "zod";
import { LocaleSchema } from "./common";
import { NotificationSettingsSchema } from "./identity";
import { NotificationSettingsUpdateRequestSchema } from "./operations";

const webPushEndpoint = z
  .string()
  .url()
  .max(2048)
  .refine((value) => value.startsWith("https://") || value.startsWith("http://localhost"), "web push endpoints must be secure");

const webPushKey = z.string().regex(/^[A-Za-z0-9_-]+$/, "web push keys must be base64url encoded").min(8).max(512);

export const WebPushSubscriptionSchema = z
  .object({
    endpoint: webPushEndpoint,
    expirationTime: z.number().int().nonnegative().nullable().optional(),
    keys: z
      .object({
        p256dh: webPushKey,
        auth: webPushKey,
      })
      .strict(),
  })
  .strict();

export const WebPushRegistrationRequestSchema = z
  .object({
    subscription: WebPushSubscriptionSchema,
    locale: LocaleSchema,
  })
  .strict();

export const WebPushCapabilitySchema = z.enum([
  "unsupported",
  "permission-required",
  "denied",
  "granted",
  "registered",
]);

export const WebPushDeliverySchema = z.enum(["registration-only", "unavailable"]);

export const WebPushRegistrationStatusSchema = z
  .object({
    registered: z.boolean(),
    deviceType: z.literal("web"),
    endpoint: webPushEndpoint.nullable(),
    capability: WebPushCapabilitySchema,
    delivery: WebPushDeliverySchema,
  })
  .strict();

export const WebPushRegistrationResponseSchema = z
  .object({
    kind: z.literal("web_push_registered"),
    registered: z.literal(true),
    deviceType: z.literal("web"),
    endpoint: webPushEndpoint,
    delivery: z.literal("registration-only"),
  })
  .strict();

export const WebPushSettingsResponseSchema = z
  .object({
    settings: NotificationSettingsSchema,
    push: WebPushRegistrationStatusSchema,
  })
  .strict();

export const WebPushSettingsUpdateRequestSchema = NotificationSettingsUpdateRequestSchema;

export type WebPushSubscription = z.infer<typeof WebPushSubscriptionSchema>;
export type WebPushRegistrationRequest = z.infer<typeof WebPushRegistrationRequestSchema>;
export type WebPushRegistrationStatus = z.infer<typeof WebPushRegistrationStatusSchema>;
export type WebPushRegistrationResponse = z.infer<typeof WebPushRegistrationResponseSchema>;
export type WebPushSettingsResponse = z.infer<typeof WebPushSettingsResponseSchema>;
export type WebPushSettingsUpdateRequest = z.infer<typeof WebPushSettingsUpdateRequestSchema>;
