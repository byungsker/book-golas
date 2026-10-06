import "server-only";

import { createServerSupabaseClient } from "@/shared/api/supabase/index.server";
import { isAdminEmail } from "@/shared/auth/admin-email";

export async function requireAdminUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !isAdminEmail(user.email)) {
    return null;
  }
  return user;
}
