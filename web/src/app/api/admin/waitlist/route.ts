import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleSupabaseClient, requireAdminUser } from "@/lib/supabase-server";

export async function GET() {
  if (!(await requireAdminUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await createServiceRoleSupabaseClient()
    .from("waitlist")
    .select("id, email, locale, source, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) return NextResponse.json({ error: "Failed to load waitlist" }, { status: 500 });
  return NextResponse.json({ entries: data ?? [] });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdminUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Invalid entry" }, { status: 400 });
  const { error } = await createServiceRoleSupabaseClient().from("waitlist").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to delete waitlist entry" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
