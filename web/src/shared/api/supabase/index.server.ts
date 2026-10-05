import "server-only";

export {
  getSupabasePublicConfig,
  SupabaseConfigurationError,
  type SupabaseEnvironment,
  type SupabasePublicConfig,
} from "./config";
export {
  createAdminSupabaseClient,
  getSupabaseAdminConfig,
  type SupabaseAdminConfig,
} from "./admin";
export { createServerSupabaseClient } from "./server";
