import { Resend } from "resend";
import { waitlistWelcomeTemplate } from "./templates";

let cached: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!cached) cached = new Resend(apiKey);
  return cached;
}

export async function sendWaitlistWelcome(
  email: string,
  locale: "ko" | "en",
): Promise<{ ok: true; id?: string } | { ok: false; reason: string }> {
  const client = getClient();
  if (!client) {
    return { ok: false, reason: "RESEND_API_KEY not configured" };
  }

  const from = process.env.RESEND_FROM_EMAIL ?? "Bookgolas <onboarding@resend.dev>";
  const replyTo = process.env.RESEND_REPLY_TO;
  const tpl = waitlistWelcomeTemplate(locale);

  const { data, error } = await client.emails.send({
    from,
    to: email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    ...(replyTo ? { replyTo } : {}),
    headers: {
      "X-Entity-Ref-ID": `waitlist-${Date.now()}`,
    },
  });

  if (error) {
    return { ok: false, reason: error.message };
  }
  return { ok: true, id: data?.id };
}
