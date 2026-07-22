import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  if (!(await requireAdminUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const { userId, title, body, pushType } = await request.json();
  if (
    typeof userId !== "string" ||
    typeof title !== "string" ||
    typeof body !== "string" ||
    userId.trim().length === 0 ||
    title.trim().length === 0 ||
    body.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "userId, title and body are required" },
      { status: 400 }
    );
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/send-fcm-push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      userId,
      title,
      body,
      data: {
        type: "test",
        pushType: typeof pushType === "string" ? pushType : "test",
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    return NextResponse.json(
      { error: data.error ?? "Failed to send push" },
      { status: response.status }
    );
  }

  return NextResponse.json({
    success: data.success,
    sentCount: data.sent,
    failedCount: data.failed,
  });
}
