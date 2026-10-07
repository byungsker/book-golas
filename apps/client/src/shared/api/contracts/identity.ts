import { z } from "zod";
import { IsoDateSchema, RecordIdSchema, UserIdSchema } from "./common";

export const UserSchema = z
  .object({
    id: UserIdSchema,
    email: z.string().email().nullable(),
    nickname: z.string().trim().min(1).max(120).nullable(),
    name: z.string().trim().min(1).max(120).nullable(),
    avatarUrl: z.string().trim().min(1).nullable(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    createdAt: IsoDateSchema.nullable(),
    lastSignInAt: IsoDateSchema.nullable(),
  })
  .strict();

export const consentKindValues = ["ai", "notifications", "camera", "share", "ocr"] as const;
export const consentStatusValues = ["required", "granted", "denied"] as const;
export const ConsentSchema = z
  .object({
    kind: z.enum(consentKindValues),
    status: z.enum(consentStatusValues),
    version: z.string().trim().min(1).max(80),
    grantedAt: IsoDateSchema.nullable(),
  })
  .strict();

export const notificationCategoryValues = [
  "daily_reminder",
  "goal",
  "event_nudge",
  "announcement",
  "deadline",
  "system",
] as const;
export const NotificationSchema = z
  .object({
    id: RecordIdSchema,
    category: z.enum(notificationCategoryValues),
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(2000),
    readAt: IsoDateSchema.nullable(),
    createdAt: IsoDateSchema,
  })
  .strict();

const notificationHour = z.number().int().min(0).max(23);
const notificationMinute = z.union([z.literal(0), z.literal(30)]);

export const NotificationSettingsSchema = z
  .object({
    notificationEnabled: z.boolean(),
    dailyReminderEnabled: z.boolean(),
    dailyReminderHour: notificationHour,
    dailyReminderMinute: notificationMinute,
    goalAlarmEnabled: z.boolean(),
    goalAlarmHour: notificationHour,
    goalAlarmMinute: notificationMinute,
    eventNudgeEnabled: z.boolean(),
    announcementsEnabled: z.boolean(),
  })
  .strict();

export type User = z.infer<typeof UserSchema>;
export type Consent = z.infer<typeof ConsentSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;
