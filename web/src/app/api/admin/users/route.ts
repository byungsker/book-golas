import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { requireAdminUser } from "@/lib/supabase-server";

export async function GET() {
  if (!(await requireAdminUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, email, nickname, name, role, subscription_status, created_at, last_sign_in_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data });
}

export async function PATCH(request: NextRequest) {
  if (!(await requireAdminUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const body = await request.json();
  const { userId, role } = body;

  if (!userId || !role) {
    return NextResponse.json(
      { error: "userId and role are required" },
      { status: 400 }
    );
  }

  if (!["user", "admin"].includes(role)) {
    return NextResponse.json(
      { error: "Invalid role. Must be 'user' or 'admin'" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("users")
    .update({ role })
    .eq("id", userId);

  if (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
