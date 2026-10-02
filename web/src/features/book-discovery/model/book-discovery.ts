import {
  ApiErrorSchema,
  type BookRecommendation,
  type BookSearchResult,
} from "@/shared/api/contracts";
import {
  BookDiscoveryResponseSchema,
  type BookDiscoveryResponse,
} from "../api/book-discovery-contracts";
import { sanitizeTrustedProviderUrl, trustedBookImageHosts } from "@/shared/lib";
import type { ProductError } from "@/shared/api/product/errors";

export function parseBookDiscoveryResponse(value: unknown): BookDiscoveryResponse | null {
  const parsed = BookDiscoveryResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function readBookDiscoveryError(value: unknown, status: number): ProductError {
  if (typeof value === "object" && value !== null && "error" in value) {
    const parsed = ApiErrorSchema.safeParse((value as { error?: unknown }).error);
    if (parsed.success) return parsed.data;
  }
  return {
    code: status === 401 ? "unauthorized" : "unavailable",
    status: status === 401 ? 401 : 503,
    message: "Book discovery is temporarily unavailable.",
    retryable: status !== 401,
  };
}

export function trustedRecommendationImage(recommendation: BookRecommendation): string | null {
  return sanitizeTrustedProviderUrl(recommendation.imageUrl, trustedBookImageHosts);
}

export function bookSearchLabel(book: BookSearchResult): string {
  return `${book.title} ${book.author}`.trim();
}

export function isAbortError(value: unknown): boolean {
  return value instanceof DOMException && value.name === "AbortError";
}
