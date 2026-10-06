import type { ReadingRecord } from "@/features/library";

export const libraryTabs = ["reading", "review", "records"] as const;
export type LibraryViewTab = (typeof libraryTabs)[number];

export function mergeById<T extends { id: string }>(current: readonly T[], next: readonly T[]): T[] {
  const seen = new Set<string>();
  return [...current, ...next].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function groupRecordsByBook(records: readonly ReadingRecord[]) {
  const groups = new Map<string, { bookId: string; bookTitle: string; bookImageUrl: string | null; records: ReadingRecord[] }>();
  for (const record of records) {
    const group = groups.get(record.bookId) ?? {
      bookId: record.bookId,
      bookTitle: record.bookTitle,
      bookImageUrl: record.bookImageUrl,
      records: [],
    };
    group.records.push(record);
    groups.set(record.bookId, group);
  }
  return [...groups.values()];
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function getLibraryTab(value: string | null | undefined): LibraryViewTab {
  return libraryTabs.includes(value as LibraryViewTab) ? value as LibraryViewTab : "reading";
}
