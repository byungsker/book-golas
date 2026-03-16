import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
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

  const body = await request.json();
  const { title, body: pushBody } = body;

  if (!title || !pushBody) {
    return NextResponse.json(
      { error: "title and body are required" },
      { status: 400 }
    );
  }

  const { data: tokens, error: tokensError } = await supabaseAdmin
    .from("fcm_tokens")
    .select("user_id, token, announcements_enabled")
    .eq("notification_enabled", true);

  if (tokensError) {
    return NextResponse.json(
      { error: tokensError.message },
      { status: 500 }
    );
  }

  const eligibleUserIds = new Set<string>();
  (tokens || []).forEach((t) => {
    if (t.announcements_enabled !== false) {
      eligibleUserIds.add(t.user_id);
    }
  });

  const userIds = Array.from(eligibleUserIds);

  if (userIds.length === 0) {
    return NextResponse.json(
      { error: "No eligible users found" },
      { status: 400 }
    );
  }

  const { data: announcement, error: insertError } = await supabaseAdmin
    .from("push_announcements")
    .insert({
      title,
      body: pushBody,
      total_count: userIds.length,
      status: "sending",
    })
    .select()
    .single();

  if (insertError || !announcement) {
    return NextResponse.json(
      { error: insertError?.message || "Failed to create announcement" },
      { status: 500 }
    );
  }

  let sentCount = 0;
  let failedCount = 0;

  const BATCH_SIZE = 5;
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (userId) => {
        const res = await fetch(
          `${supabaseUrl}/functions/v1/send-fcm-push`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${anonKey}`,
            },
            body: JSON.stringify({
              userId,
              title,
              body: pushBody,
              data: {
                pushType: "announcement",
                announcementId: announcement.id,
              },
            }),
          }
        );
        return { userId, ok: res.ok, data: await res.json() };
      })
    );

    for (const result of results) {
      if (
        result.status === "fulfilled" &&
        result.value.ok &&
        result.value.data.success
      ) {
        sentCount += result.value.data.sent || 1;
      } else {
        failedCount++;
      }
    }
  }

  await supabaseAdmin.from("push_logs").insert(
    userIds.map((userId) => ({
      user_id: userId,
      push_type: "announcement",
      title,
      body: pushBody,
    }))
  );

  const finalStatus = failedCount === userIds.length ? "failed" : "sent";

  await supabaseAdmin
    .from("push_announcements")
    .update({
      sent_count: sentCount,
      failed_count: failedCount,
      status: finalStatus,
      sent_at: new Date().toISOString(),
    })
    .eq("id", announcement.id);

  return NextResponse.json({
    success: true,
    announcement_id: announcement.id,
    total: userIds.length,
    sent: sentCount,
    failed: failedCount,
  });
}
