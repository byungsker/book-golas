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
  const { data, error } = await client.from("waitlist").delete().eq("id", id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Failed to delete waitlist entry" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Waitlist entry not found" }, { status: 404 });
  await client.from("admin_audit_events").insert({ actor_id: admin.id, action: "waitlist.delete", resource_type: "waitlist", resource_id: id, metadata: { reason: "admin_requested" } });
  return NextResponse.json({ ok: true });
}
