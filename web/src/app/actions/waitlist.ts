"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { sendWaitlistWelcome } from "@/lib/email/client";

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export type WaitlistResult =
  | { ok: true }
  | { ok: false; code: "invalid" | "duplicate" | "unknown" };

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

  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent")?.slice(0, 500) ?? null;
  const locale = localeInput === "en" ? "en" : "ko";

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("waitlist")
    .insert({ email, locale, user_agent: userAgent, source });

  if (error) {
    if (error.code === "23505") return { ok: false, code: "duplicate" };
    return { ok: false, code: "unknown" };
  }

  after(async () => {
    const result = await sendWaitlistWelcome(email, locale);
    if (!result.ok) {
      console.error("[waitlist] email send failed", { email, reason: result.reason });
    }
  });

  return { ok: true };
}
