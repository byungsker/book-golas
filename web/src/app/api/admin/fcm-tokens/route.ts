import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl.trim(), serviceRoleKey.trim(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: tokensData, error: tokensError } = await supabaseAdmin
    .from("fcm_tokens")
    .select("user_id, token, device_type");

  if (tokensError) {
    console.error("Error fetching FCM tokens:", tokensError);
    return NextResponse.json(
      { error: tokensError.message },
      { status: 500 }
    );
  }

  const userMap = new Map<
    string,
    { user_id: string; token_count: number; device_type: string }
  >();

  tokensData?.forEach((row) => {
    const existing = userMap.get(row.user_id);
    if (existing) {
      existing.token_count++;
    } else {
      userMap.set(row.user_id, {
        user_id: row.user_id,
        token_count: 1,
        device_type: row.device_type || "unknown",
      });
    }
  });

  const userIds = Array.from(userMap.keys());

  const emailMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });

    if (authUsers) {
      authUsers.forEach((u) => {
        if (u.email) {
          emailMap.set(u.id, u.email);
        }
      });
    }
  }

  const users = Array.from(userMap.values()).map((data) => ({
    user_id: data.user_id,
    email: emailMap.get(data.user_id) || data.user_id.slice(0, 8) + "...",
    token_count: data.token_count,
    device_type: data.device_type,
  }));

  return NextResponse.json({ users });
}
