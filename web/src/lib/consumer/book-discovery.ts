import {
  ApiErrorSchema,
  BookDiscoveryResponseSchema,
  type BookDiscoveryResponse,
  type BookRecommendation,
  type BookSearchResult,
} from "@/lib/product/contracts";
import type { ProductError } from "@/lib/product/dal/errors";

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
  const image = recommendation.imageUrl;
  if (!image) return null;
  try {
    const url = new URL(image);
    return ["books.google.com", "books.googleusercontent.com", "image.aladin.co.kr"].includes(url.hostname.toLowerCase()) && url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function bookSearchLabel(book: BookSearchResult): string {
  return `${book.title} ${book.author}`.trim();
}

export function isAbortError(value: unknown): boolean {
  return value instanceof DOMException && value.name === "AbortError";
}
