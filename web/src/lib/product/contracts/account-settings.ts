import { z } from "zod";
import { IsoDateSchema, LocaleSchema, UserIdSchema } from "./common";

export const AccountProfileSchema = z
  .object({
    id: UserIdSchema,
    email: z.string().email().nullable(),
    nickname: z.string().trim().min(1).max(120).nullable(),
    name: z.string().trim().min(1).max(120).nullable(),
    avatarUrl: z.string().url().nullable(),
    createdAt: IsoDateSchema.nullable(),
    lastSignInAt: IsoDateSchema.nullable(),
  })
  .strict();

export const AccountProfileUpdateRequestSchema = z
  .object({
    nickname: z.string().trim().min(1).max(120),
  })
  .strict();

export const AccountSettingsSubscriptionSchema = z
  .object({
    enabled: z.literal(false),
    status: z.enum(["free", "disabled"]),
  })
  .strict();

export const AccountSettingsResponseSchema = z
  .object({
    state: z.enum(["ready", "empty"]),
    profile: AccountProfileSchema.nullable(),
    subscription: AccountSettingsSubscriptionSchema,
  })
  .strict();

export const AccountAvatarResponseSchema = z
  .object({
    kind: z.literal("avatar_updated"),
    path: z.string().trim().min(1).max(300),
    avatarUrl: z.string().url(),
  })
  .strict();

export const AccountSettingsLocaleSchema = LocaleSchema;

export type AccountProfile = z.infer<typeof AccountProfileSchema>;
export type AccountProfileUpdateRequest = z.infer<typeof AccountProfileUpdateRequestSchema>;
export type AccountSettingsResponse = z.infer<typeof AccountSettingsResponseSchema>;
export type AccountAvatarResponse = z.infer<typeof AccountAvatarResponseSchema>;
export type AccountSettingsLocale = z.infer<typeof AccountSettingsLocaleSchema>;
