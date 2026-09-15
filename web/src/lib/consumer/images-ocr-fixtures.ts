import {
  BookImageSchema,
  ImageIdSchema,
  type BookImage,
  type ImageOcrOutcome,
  type ImagesOcrJsonMutation,
} from "@/lib/product/contracts";
import {
  consentRequiredError,
  failure,
  notFoundError,
  offlineError,
  payloadTooLargeError,
  quotaExceededError,
  success,
  unavailableError,
  validationError,
  type ProductError,
  type ProductResult,
} from "@/lib/product/dal/errors";

export type ImagesOcrFixtureUpload = Readonly<{
  action: "upload";
  bookId: string;
  mimeType: string;
  byteSize: number;
  ocrConsent: boolean;
  manualText: string;
  idempotencyKey: string;
}>;

type FixtureMutation = ImagesOcrFixtureUpload | ImagesOcrJsonMutation;
type FixtureMutationResult = Readonly<{
  image?: BookImage;
  imageId?: string;
  duplicate: boolean;
  ocr?: ImageOcrOutcome;
}>;

const now = "2026-09-16T00:00:00.000Z";
const states = new Map<string, BookImage[]>();
const mutationsByKey = new Map<string, FixtureMutationResult>();
const retryKeys = new Set<string>();

function stateKey(fixture: string, bookId: string): string {
  return `${fixture}:${bookId}`;
}

function imageFor(bookId: string, id: string, overrides: Partial<BookImage> = {}): BookImage {
  return BookImageSchema.parse({
    id: ImageIdSchema.parse(id),
    bookId,
    storageBucket: "book-images",
    storagePath: `00000000-0000-4000-8000-000000000001/${bookId}/${id}.png`,
    signedUrl: `https://storage.example.invalid/sign/${id}.png`,
    signedUrlExpiresAt: "2026-09-16T00:15:00.000Z",
    mimeType: "image/png",
    byteSize: 68,
    caption: null,
    pageNumber: 12,
    extractedText: "",
    ocrStatus: "not_requested",
    ocrError: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

function initialImages(fixture: string, bookId: string): BookImage[] {
  if (fixture === "images-ocr-expired-url") {
    return [imageFor(bookId, "00000000-0000-4000-8000-000000004351", {
      signedUrlExpiresAt: "2026-09-15T23:59:00.000Z",
      ocrStatus: "ready",
      extractedText: "A signed image fixture.",
    })];
  }
  return [];
}

function recordsFor(fixture: string, bookId: string): BookImage[] {
  const key = stateKey(fixture, bookId);
  const current = states.get(key);
  if (current) return current;
  const initial = initialImages(fixture, bookId);
  states.set(key, initial);
  return initial;
}

function errorForFixture(fixture: string): ProductError | null {
  if (fixture === "images-ocr-unauthorized") return { code: "unauthorized", status: 401, message: "Sign-in required.", retryable: false };
  if (fixture === "images-ocr-error") return unavailableError("Image records are temporarily unavailable.");
  if (fixture === "images-ocr-offline") return offlineError();
  if (fixture === "images-ocr-deleted" || fixture === "images-ocr-foreign") return notFoundError();
  return null;
}

function ocrOutcome(image: BookImage): ImageOcrOutcome {
  const code = image.ocrStatus === "failed"
    ? image.ocrError?.toLowerCase().includes("consent") ? "consent_required" : image.ocrError?.toLowerCase().includes("quota") ? "quota_exceeded" : "provider_error"
    : null;
  return { status: image.ocrStatus, errorCode: code, message: image.ocrError };
}

function failureForUpload(fixture: string): ProductError | null {
  if (fixture === "images-ocr-oversize") return payloadTooLargeError("Images must be 8 MiB or smaller.");
  if (fixture === "images-ocr-wrong-mime" || fixture === "images-ocr-corrupt") return validationError("The image file is invalid.");
  if (fixture === "images-ocr-consent") return consentRequiredError("OCR consent is required before OCR can run.");
  if (fixture === "images-ocr-quota") return quotaExceededError("The OCR quota has been reached.");
  return null;
}

export function getImagesOcrFixtureRecords(fixture: string, bookId: string): ProductResult<BookImage[]> {
  const error = errorForFixture(fixture);
  if (error) return failure(error);
  return success(recordsFor(fixture, bookId));
}

export function applyImagesOcrFixtureMutation(
  fixture: string,
  input: FixtureMutation,
): ProductResult<FixtureMutationResult> {
  const fixtureError = errorForFixture(fixture);
  if (fixtureError) return failure(fixtureError);
  const mutationKey = `${fixture}:${input.bookId}:${input.idempotencyKey}`;
  const previous = mutationsByKey.get(mutationKey);
  if (previous) return success({ ...previous, duplicate: true });

  if (input.action === "upload") {
    const uploadError = failureForUpload(fixture);
    if (uploadError && fixture !== "images-ocr-consent" && fixture !== "images-ocr-quota") return failure(uploadError);
    const id = ImageIdSchema.parse(`00000000-0000-4000-8000-${String(recordsFor(fixture, input.bookId).length + 4352).padStart(12, "0")}`);
    const hasProviderFailure = fixture === "images-ocr-provider-failure";
    const hasConsentFailure = fixture === "images-ocr-consent" && input.ocrConsent;
    const hasQuotaFailure = fixture === "images-ocr-quota" && input.ocrConsent;
    const failedMessage = hasConsentFailure
      ? "OCR consent is required before OCR can run."
      : hasQuotaFailure
        ? "The OCR quota has been reached."
        : hasProviderFailure
          ? "The OCR provider is unavailable."
          : null;
    const image = imageFor(input.bookId, id, {
      byteSize: input.byteSize,
      mimeType: input.mimeType as BookImage["mimeType"],
      extractedText: input.manualText,
      ocrStatus: failedMessage ? "failed" : input.manualText.trim() ? "manual" : input.ocrConsent ? "ready" : "not_requested",
      ocrError: failedMessage,
      signedUrlExpiresAt: fixture === "images-ocr-expired-url" ? "2026-09-15T23:59:00.000Z" : "2026-09-16T00:15:00.000Z",
    });
    recordsFor(fixture, input.bookId).unshift(image);
    const result = { image, duplicate: false, ocr: ocrOutcome(image) };
    mutationsByKey.set(mutationKey, result);
    return success(result);
  }

  const records = recordsFor(fixture, input.bookId);
  const index = records.findIndex((candidate) => candidate.id === input.imageId);
  if (index < 0) return failure(notFoundError());
  if (input.action === "delete") {
    records.splice(index, 1);
    const result = { imageId: input.imageId, duplicate: false };
    mutationsByKey.set(mutationKey, result);
    return success(result);
  }
  if (input.action === "manual") {
    const image = imageFor(input.bookId, records[index].id, {
      ...records[index],
      extractedText: input.manualText,
      ocrStatus: "manual",
      ocrError: null,
      updatedAt: now,
    });
    records[index] = image;
    const result = { image, duplicate: false, ocr: ocrOutcome(image) };
    mutationsByKey.set(mutationKey, result);
    return success(result);
  }
  if (!input.ocrConsent) return failure(consentRequiredError("OCR consent is required before retrying."));
  if (records[index].ocrStatus === "ready" || retryKeys.has(mutationKey)) {
    return success({ image: records[index], duplicate: true, ocr: ocrOutcome(records[index]) });
  }
  retryKeys.add(mutationKey);
  const image = imageFor(input.bookId, records[index].id, {
    ...records[index],
    ocrStatus: fixture === "images-ocr-provider-failure" ? "failed" : "ready",
    extractedText: fixture === "images-ocr-provider-failure" ? records[index].extractedText : "OCR retry text.",
    ocrError: fixture === "images-ocr-provider-failure" ? "The OCR provider is unavailable." : null,
    updatedAt: now,
  });
  records[index] = image;
  const result = { image, duplicate: false, ocr: ocrOutcome(image) };
  mutationsByKey.set(mutationKey, result);
  return success(result);
}
