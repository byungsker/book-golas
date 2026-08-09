import { createHmac } from "node:crypto";
import { isIP } from "node:net";

type HeaderReader = Pick<Headers, "get">;

export function getWaitlistClientIp(headerStore: HeaderReader): string | null {
  const raw = (headerStore.get("x-vercel-forwarded-for") ?? headerStore.get("x-forwarded-for"))?.trim();
  if (!raw || raw.includes(",")) return null;
  const candidate = raw.replace(/^\[|\]$/g, "");
  const family = isIP(candidate);
  if (family === 4) return candidate;
  if (family !== 6) return null;
  try {
    return new URL(`http://[${candidate}]`).hostname.slice(1, -1).toLowerCase();
  } catch {
    return null;
  }
}

export function hashWaitlistClientIp(ip: string, secret: string): string {
  if (Buffer.byteLength(secret, "utf8") < 32) throw new Error("Waitlist HMAC secret is too short");
  return createHmac("sha256", secret).update(ip).digest("hex");
}
