import {
  ConsumerRecordSchema,
  type ConsumerRecord,
  type NotesHighlightsMutation,
} from "@/lib/product/contracts";
import {
  conflictError,
  failure,
  notFoundError,
  offlineError,
  quotaExceededError,
  success,
  unauthorizedError,
  unavailableError,
  consentRequiredError,
  validationError,
  type ProductResult,
} from "@/lib/product/dal/errors";

const fixtureNow = "2026-09-16T00:05:00.000Z";
const fixtureUserId = "00000000-0000-4000-8000-000000000001";
const defaultTotalPages = 240;

const initialRecords: readonly ConsumerRecord[] = [
  ConsumerRecordSchema.parse({
    id: "00000000-0000-4000-8000-000000004321",
    bookId: "00000000-0000-4000-8000-000000004332",
    recordType: "note",
    pageNumber: 18,
    contentText: "Try this idea during the next reading session.",
    caption: null,
    imageUrl: null,
    rectangles: [],
    sourceId: null,
    sourceHref: null,
    indexStatus: "ready",
    indexError: null,
    createdAt: "2026-09-15T00:00:00.000Z",
    updatedAt: "2026-09-15T00:00:00.000Z",
  }),
  ConsumerRecordSchema.parse({
    id: "00000000-0000-4000-8000-000000004322",
    bookId: "00000000-0000-4000-8000-000000004332",
    recordType: "highlight",
    pageNumber: 42,
    contentText: "Attention is a practice we can return to.",
    caption: null,
    imageUrl: null,
    rectangles: [{ x: 0.12, y: 0.22, width: 0.64, height: 0.08 }],
    sourceId: "00000000-0000-4000-8000-000000004322",
    sourceHref: null,
    indexStatus: "ready",
    indexError: null,
    createdAt: "2026-09-14T00:00:00.000Z",
    updatedAt: "2026-09-14T00:00:00.000Z",
  }),
  ConsumerRecordSchema.parse({
    id: "00000000-0000-4000-8000-000000004323",
    bookId: "00000000-0000-4000-8000-000000004332",
    recordType: "memorable_page",
    pageNumber: 88,
    contentText: "",
    caption: "A page to revisit when the season changes.",
    imageUrl: "https://images.example.test/bookgolas/memorable-page-88.jpg",
    rectangles: [],
    sourceId: "00000000-0000-4000-8000-000000004323",
    sourceHref: null,
    indexStatus: "skipped",
    indexError: null,
    createdAt: "2026-09-13T00:00:00.000Z",
    updatedAt: "2026-09-13T00:00:00.000Z",
  }),
];

const recordsByFixture = new Map<string, ConsumerRecord[]>();
const mutationsByKey = new Map<string, ConsumerRecord>();
const retryKeys = new Set<string>();

function cloneRecord(record: ConsumerRecord): ConsumerRecord {
  return ConsumerRecordSchema.parse({
    ...record,
    rectangles: record.rectangles.map((rectangle) => ({ ...rectangle })),
  });
}

function fixtureRecords(fixture: string, bookId: string): ConsumerRecord[] {
  const key = `${fixture}:${bookId}`;
  const existing = recordsByFixture.get(key);
  if (existing) return existing;
  const records = fixture === "notes-highlights-empty"
    ? []
    : initialRecords.filter((record) => record.bookId === bookId).map(cloneRecord);
  recordsByFixture.set(key, records);
  return records;
}

function errorForFixture(fixture: string) {
  if (fixture === "notes-highlights-unauthorized") return unauthorizedError();
  if (fixture === "notes-highlights-foreign") return notFoundError();
  if (fixture === "notes-highlights-offline") return offlineError("The record service is offline.");
  if (fixture === "notes-highlights-quota") return quotaExceededError("Record quota exceeded.");
  if (fixture === "notes-highlights-consent") return consentRequiredError("AI indexing consent is required.");
  if (fixture === "notes-highlights-error") return unavailableError("The record service is unavailable.");
  if (fixture === "notes-highlights-conflict") return conflictError("The record changed. Refresh and try again.");
  return null;
}

function isIndexFailureFixture(fixture: string): boolean {
  return fixture === "notes-highlights-index-failure";
}

function recordFromInput(
  input: NotesHighlightsMutation,
  recordId: string,
  indexStatus: ConsumerRecord["indexStatus"],
  indexError: string | null,
): ConsumerRecord {
  return ConsumerRecordSchema.parse({
    id: recordId,
    bookId: input.bookId,
    recordType: input.recordType,
    pageNumber: input.pageNumber ?? null,
    contentText: input.contentText,
    caption: input.caption ?? null,
    imageUrl: input.imageUrl ?? null,
    rectangles: input.rectangles,
    sourceId: input.sourceId ?? null,
    sourceHref: input.sourceHref ?? null,
    indexStatus,
    indexError,
    createdAt: fixtureNow,
    updatedAt: fixtureNow,
  });
}

export function getNotesHighlightsFixtureRecords(
  fixture: string,
  bookId: string,
): ProductResult<ConsumerRecord[]> {
  const fixtureError = errorForFixture(fixture);
  if (fixtureError) return failure(fixtureError);
  if (fixture === "notes-highlights-deleted") return failure(notFoundError());
  return success(fixtureRecords(fixture, bookId).map(cloneRecord));
}

export function applyNotesHighlightsFixtureMutation(
  fixture: string,
  input: NotesHighlightsMutation,
): ProductResult<{ record?: ConsumerRecord; recordId?: string; duplicate: boolean }> {
  const fixtureError = errorForFixture(fixture);
  if (fixtureError) return failure(fixtureError);
  if (fixture === "notes-highlights-deleted") return failure(notFoundError());
  if (input.pageNumber !== undefined && input.pageNumber !== null && input.pageNumber > defaultTotalPages) {
    return failure(validationError("The page number is outside the book."));
  }

  const records = fixtureRecords(fixture, input.bookId);
  const mutationKey = `${fixture}:${input.bookId}:${input.action}:${input.idempotencyKey}`;

  if (input.action === "create") {
    const previous = mutationsByKey.get(mutationKey);
    if (previous) return success({ record: cloneRecord(previous), duplicate: true });
    const record = recordFromInput(
      input,
      crypto.randomUUID(),
      isIndexFailureFixture(fixture) ? "failed" : input.aiConsent ? "ready" : "skipped",
      isIndexFailureFixture(fixture) ? "Indexing service unavailable." : null,
    );
    records.unshift(record);
    mutationsByKey.set(mutationKey, record);
    return success({ record: cloneRecord(record), duplicate: false });
  }

  const record = input.recordId
    ? records.find((candidate) => candidate.id === input.recordId)
    : undefined;
  if (!record) return failure(notFoundError());

  if (input.action === "delete") {
    const index = records.findIndex((candidate) => candidate.id === record.id);
    records.splice(index, 1);
    return success({ recordId: record.id, duplicate: false });
  }

  if (input.action === "update") {
    const previous = mutationsByKey.get(mutationKey);
    if (previous) return success({ record: cloneRecord(previous), duplicate: true });
    const nextStatus = isIndexFailureFixture(fixture) ? "failed" : input.aiConsent ? "ready" : "skipped";
    const updated = recordFromInput(input, record.id, nextStatus, isIndexFailureFixture(fixture) ? "Indexing service unavailable." : null);
    const index = records.findIndex((candidate) => candidate.id === record.id);
    records[index] = updated;
    mutationsByKey.set(mutationKey, updated);
    return success({ record: cloneRecord(updated), duplicate: false });
  }

  const retryKey = `${fixture}:${input.bookId}:${record.id}:${input.idempotencyKey}`;
  if (record.indexStatus === "ready" || retryKeys.has(retryKey)) {
    return success({ record: cloneRecord(record), duplicate: true });
  }
  retryKeys.add(retryKey);
  const index = records.findIndex((candidate) => candidate.id === record.id);
  const retried = ConsumerRecordSchema.parse({
    ...record,
    indexStatus: isIndexFailureFixture(fixture) ? "failed" : "ready",
    indexError: isIndexFailureFixture(fixture) ? "Indexing service unavailable." : null,
    updatedAt: fixtureNow,
  });
  records[index] = retried;
  return success({ record: cloneRecord(retried), duplicate: false });
}

export { fixtureUserId };
