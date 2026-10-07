import type { CapabilityId } from "./contracts.ts";

export interface QuotaResult {
  allowed: boolean;
  remaining: number;
  reset_at: string;
}

export interface QuotaController {
  consume(userId: string, capability: CapabilityId, now: number): QuotaResult;
}

interface Bucket {
  started_at: number;
  count: number;
}

export class InMemoryQuotaController implements QuotaController {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly maxRequests = 60,
    private readonly windowMs = 60_000,
  ) {}

  consume(userId: string, capability: CapabilityId, now: number): QuotaResult {
    const key = `${userId}:${capability}`;
    const existing = this.buckets.get(key);
    const bucket = existing && now - existing.started_at < this.windowMs
      ? existing
      : { started_at: now, count: 0 };
    bucket.count += 1;
    this.buckets.set(key, bucket);
    const remaining = Math.max(this.maxRequests - bucket.count, 0);
    const allowed = bucket.count <= this.maxRequests;
    return {
      allowed,
      remaining,
      reset_at: new Date(bucket.started_at + this.windowMs).toISOString(),
    };
  }
}
