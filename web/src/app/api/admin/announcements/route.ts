import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient, requireAdminUser } from "@/lib/supabase-server";

export async function GET() {
  if (!(await requireAdminUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await createServiceRoleSupabaseClient()
    .from("push_announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: "Failed to load announcements" }, { status: 500 });
  return NextResponse.json({ announcements: data ?? [] });
}
