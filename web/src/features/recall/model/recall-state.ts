import { z } from "zod";

export const RecallUiStateSchema = z.enum([
  "idle",
  "loading",
  "success",
  "empty",
  "unauthorized",
  "consent_required",
  "quota_exceeded",
  "provider_error",
  "offline",
  "error",
]);
export type RecallUiState = z.infer<typeof RecallUiStateSchema>;
