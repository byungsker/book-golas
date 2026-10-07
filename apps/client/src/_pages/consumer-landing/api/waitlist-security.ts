import { createHmac } from "node:crypto";
import { isIP } from "node:net";

type HeaderReader = Pick<Headers, "get">;

export type WaitlistRpcResult = "success" | "duplicate" | "invalid" | "rate_limited" | "unknown";

export function toPublicWaitlistResult(result: WaitlistRpcResult) {
  if (result === "success" || result === "duplicate") return { ok: true as const };
  if (result === "invalid") return { ok: false as const, code: "invalid" as const };
  return { ok: false as const, code: "unknown" as const };
}

export function shouldSendWaitlistWelcome(result: WaitlistRpcResult): boolean {
  return result === "success";
}

export function getWaitlistClientIp(headerStore: HeaderReader): string | null {
  const raw = headerStore.get("x-vercel-forwarded-for")?.trim();
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
