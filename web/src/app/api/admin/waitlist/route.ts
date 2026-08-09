import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleSupabaseClient, requireAdminUser } from "@/lib/supabase-server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid entry" }, { status: 400 });
  const client = createServiceRoleSupabaseClient();
  const { data, error } = await client.rpc("admin_delete_waitlist_entry", {
    p_actor_id: admin.id,
    p_entry_id: id,
  });
  if (error) return NextResponse.json({ error: "Failed to delete waitlist entry" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Waitlist entry not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
