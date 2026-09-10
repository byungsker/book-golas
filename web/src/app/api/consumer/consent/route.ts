import { NextRequest, NextResponse } from "next/server";
import { ConsentUpdateRequestSchema } from "@/lib/product/contracts/operations";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const MAX_BODY_BYTES = 64 * 1024;

async function authenticatedClient() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return error || !user ? null : { supabase, user };
  } catch {
    return { unavailable: true as const };
  }
}

export async function GET() {
  const context = await authenticatedClient();
  if (!context) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if ("unavailable" in context) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const { data, error } = await context.supabase
    .from("user_consents")
    .select("kind, status, version, granted_at, updated_at")
    .eq("user_id", context.user.id)
    .order("kind", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  return NextResponse.json({ consents: Array.isArray(data) ? data : [] });
}

export async function POST(request: NextRequest) {
  const context = await authenticatedClient();
  if (!context) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if ("unavailable" in context) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = ConsentUpdateRequestSchema.safeParse(parsedBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { data, error } = await context.supabase.rpc("record_user_consent", {
    p_kind: parsed.data.kind,
    p_status: parsed.data.status,
    p_version: parsed.data.version,
  });
  if (error || data !== true) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  return NextResponse.json(parsed.data, { status: 200 });
}
