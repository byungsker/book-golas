import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleSupabaseClient, requireAdminUser } from "@/lib/supabase-server";

const EDITABLE_FIELDS = [
  "name",
  "title",
  "body_template",
  "title_en",
  "body_template_en",
  "is_active",
  "priority",
] as const;

export async function GET() {
  if (!(await requireAdminUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await createServiceRoleSupabaseClient()
    .from("push_templates")
    .select("*")
    .order("priority", { ascending: true });
  if (error) return NextResponse.json({ error: "Failed to load templates" }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  if (!(await requireAdminUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Invalid template" }, { status: 400 });
  const updates = Object.fromEntries(
    EDITABLE_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(body, field)).map((field) => [field, body[field]])
  );
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No changes" }, { status: 400 });
  const { error } = await createServiceRoleSupabaseClient().from("push_templates").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
