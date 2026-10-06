import { z } from "zod";
import { BookSearchResultSchema, LocaleSchema, RecommendationResultSchema } from "@/shared/api/contracts";
import { sanitizeTrustedProviderUrl, trustedBookImageHosts } from "@/shared/lib";

export const bookDiscoverySearchModeValues = ["text", "isbn"] as const;
export const BookDiscoverySearchModeSchema = z.enum(bookDiscoverySearchModeValues);

export const BookDiscoverySearchRequestSchema = z
  .object({
    action: z.literal("search"),
    locale: LocaleSchema,
    mode: BookDiscoverySearchModeSchema,
    query: z.string().trim().min(1).max(200),
  })
  .strict();

export const BookDiscoveryRecommendationRequestSchema = z
  .object({
    action: z.literal("recommendations"),
    locale: LocaleSchema,
  })
  .strict();

export const BookDiscoveryRequestSchema = z.discriminatedUnion("action", [
  BookDiscoverySearchRequestSchema,
  BookDiscoveryRecommendationRequestSchema,
]);

export const BookDiscoverySearchResponseSchema = z
  .object({
    kind: z.literal("search"),
    books: z.array(BookSearchResultSchema).max(10),
  })
  .strict();

export const BookDiscoveryRecommendationResponseSchema = z
  .object({
    kind: z.literal("recommendations"),
    result: RecommendationResultSchema,
  })
  .strict();

export const BookDiscoveryResponseSchema = z.discriminatedUnion("kind", [
  BookDiscoverySearchResponseSchema,
  BookDiscoveryRecommendationResponseSchema,
]);

export function isTrustedBookImageUrl(value: string | null | undefined): value is string {
  return sanitizeTrustedProviderUrl(value, trustedBookImageHosts) !== null;
}

export type BookDiscoveryRequest = z.infer<typeof BookDiscoveryRequestSchema>;
export type BookDiscoveryResponse = z.infer<typeof BookDiscoveryResponseSchema>;
