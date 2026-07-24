import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function hashSecret(secret: string): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)),
  );
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index++) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const bearerToken = req.headers.get("Authorization")
      ?.replace(/^Bearer\s+/i, "") ?? "";

    const isServiceRole = serviceRoleKey.length > 0 && timingSafeEqual(
      await hashSecret(bearerToken),
      await hashSecret(serviceRoleKey),
    );
    if (!isServiceRole) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { userId, title, body, pushType } = await req.json();
    if (
      typeof userId !== "string" ||
      typeof title !== "string" ||
      typeof body !== "string" ||
      userId.trim().length === 0 ||
      title.trim().length === 0 ||
      body.trim().length === 0
    ) {
      return jsonResponse(
        { error: "userId, title and body are required" },
        400,
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

    const responseBody = await response.json();
    return jsonResponse(
      response.ok
        ? {
          success: responseBody.success,
          sentCount: responseBody.sent,
          failedCount: responseBody.failed,
        }
        : { error: responseBody.error ?? "Failed to send push" },
      response.status,
    );
  } catch (error: unknown) {
    console.error("Test push failed:", error);
    return jsonResponse({ error: "Failed to send test push" }, 500);
  }
});
