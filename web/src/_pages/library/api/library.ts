import type { LibraryPayload, LibraryRecordType } from "@/features/library";

export type LibraryRequest = Readonly<{
  locale: "ko" | "en";
  tab: LibraryPayload["tab"];
  query?: string;
  cursor?: string | null;
  limit?: number;
  recordType?: LibraryRecordType | null;
}>;

export function buildLibraryApiUrl(request: LibraryRequest): string {
  const params = new URLSearchParams({ locale: request.locale, tab: request.tab });
  if (request.query?.trim()) params.set("query", request.query.trim());
  if (request.cursor) params.set("cursor", request.cursor);
  if (request.limit !== undefined) params.set("limit", String(request.limit));
  if (request.recordType) params.set("recordType", request.recordType);
  return `/api/consumer/library?${params.toString()}`;
}
