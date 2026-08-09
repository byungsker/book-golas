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
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validText(value: unknown, max: number, nullable = false): boolean {
  return (nullable && value === null) || (typeof value === "string" && value.length <= max);
}

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
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid template" }, { status: 400 });
  const unknown = Object.keys(body ?? {}).filter((key) => key !== "id" && !EDITABLE_FIELDS.includes(key as (typeof EDITABLE_FIELDS)[number]));
  if (unknown.length > 0) return NextResponse.json({ error: "Unknown template fields" }, { status: 400 });
  const updates = Object.fromEntries(
    EDITABLE_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(body, field)).map((field) => [field, body[field]])
  );
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No changes" }, { status: 400 });
  if ("name" in updates && !validText(updates.name, 120, true)) return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  if ("title" in updates && !validText(updates.title, 120)) return NextResponse.json({ error: "Invalid title" }, { status: 400 });
  if ("body_template" in updates && !validText(updates.body_template, 1000)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  if ("title_en" in updates && !validText(updates.title_en, 120, true)) return NextResponse.json({ error: "Invalid English title" }, { status: 400 });
  if ("body_template_en" in updates && !validText(updates.body_template_en, 1000, true)) return NextResponse.json({ error: "Invalid English body" }, { status: 400 });
  if ("is_active" in updates && typeof updates.is_active !== "boolean") return NextResponse.json({ error: "Invalid active state" }, { status: 400 });
  if ("priority" in updates && (!Number.isInteger(updates.priority) || updates.priority < 0 || updates.priority > 10000)) return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
  const client = createServiceRoleSupabaseClient();
  const { data, error } = await client.rpc("admin_update_push_template", {
    p_actor_id: admin.id,
    p_template_id: id,
    p_changes: updates,
  });
  if (error) return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
