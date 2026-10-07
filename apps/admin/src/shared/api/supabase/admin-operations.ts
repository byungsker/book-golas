import "server-only";

import { createAdminSupabaseClient } from "@/shared/api/supabase/admin";

export { requireAdminUser } from "@/_app/auth/index.server";

export function createServiceRoleSupabaseClient() {
  return createAdminSupabaseClient();
}
