import { createHmac } from "node:crypto";

type HeaderReader = Pick<Headers, "get">;

export function getWaitlistClientIp(headerStore: HeaderReader): string | null {
  const direct = headerStore.get("cf-connecting-ip") ?? headerStore.get("x-real-ip");
  if (direct?.trim()) return direct.trim();

  const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || null;
}

export function hashWaitlistClientIp(ip: string, secret: string): string {
  return createHmac("sha256", secret).update(ip).digest("hex");
}
