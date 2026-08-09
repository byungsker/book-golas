"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-server";
import { sendWaitlistWelcome } from "@/lib/email/client";
import { getWaitlistClientIp, hashWaitlistClientIp, shouldSendWaitlistWelcome, toPublicWaitlistResult, type WaitlistRpcResult } from "@/lib/waitlist-security";

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export type WaitlistResult =
  | { ok: true }
  | { ok: false; code: "invalid" | "unknown" };

export async function joinWaitlist(formData: FormData): Promise<WaitlistResult> {
  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot.length > 0) {
    return { ok: true };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const localeInput = String(formData.get("locale") ?? "ko");
  const source = String(formData.get("source") ?? "landing").slice(0, 64);

  if (!EMAIL_REGEX.test(email) || email.length > 254) {
    return { ok: false, code: "invalid" };
  }

  const locale = localeInput === "en" ? "en" : "ko";

  const headerStore = await headers();
  const ip = getWaitlistClientIp(headerStore);
  const secret = process.env.WAITLIST_IP_HMAC_SECRET?.trim();
  if (!ip || !secret) return { ok: false, code: "unknown" };

  let result: string | null = null;
  try {
    const supabase = createServiceRoleSupabaseClient();
    const response = await supabase.rpc("register_waitlist_submission", {
      p_email: email,
      p_locale: locale,
      p_source: source,
      p_ip_hash: hashWaitlistClientIp(ip, secret),
    });
    if (response.error) return { ok: false, code: "unknown" };
    result = response.data;
  } catch {
    return { ok: false, code: "unknown" };
  }

  const publicResult = toPublicWaitlistResult((result ?? "unknown") as WaitlistRpcResult);
  if (!publicResult.ok) return publicResult;

  if (shouldSendWaitlistWelcome((result ?? "unknown") as WaitlistRpcResult)) {
    after(async () => {
      const welcomeResult = await sendWaitlistWelcome(email, locale);
      if (!welcomeResult.ok) {
        console.error("[waitlist] email send failed", { reason: welcomeResult.reason });
      }
    });
  }

  return { ok: true };
}
