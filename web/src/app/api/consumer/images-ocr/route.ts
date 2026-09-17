import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import {
  BookIdSchema,
  ImageIdSchema,
  ImagesOcrJsonMutationSchema,
  ImagesOcrUploadMetadataSchema,
  validateBookImageBytes,
  type ImagesOcrResponse,
} from "@/lib/product/contracts";
import {
  deleteOwnedBookImage,
  listOwnedBookImagesWithSignedUrls,
  retryOwnedBookImageOcr,
  updateOwnedBookImageManualText,
  uploadOwnedBookImage,
} from "@/lib/product/dal";
import { payloadTooLargeError, validationError, type ProductError } from "@/lib/product/dal/errors";
import { productErrorResponse } from "@/lib/product/dal/http";
import { getConsumerRouteFixture } from "@/lib/consumer/route-fixture";
import {
  applyImagesOcrFixtureMutation,
  getImagesOcrFixtureRecords,
  type ImagesOcrFixtureUpload,
} from "@/lib/consumer/images-ocr-fixtures";
function privateJson(body: ImagesOcrResponse, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function privateError(error: ProductError): NextResponse {
  const response = productErrorResponse(error);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function invalidatedPaths(locale: "ko" | "en", bookId: string): string[] {
  return [`/${locale}/books/${bookId}`, `/${locale}/reading/${bookId}`, `/${locale}/library`];
}

function isImagesFixture(fixture: string | null): boolean {
  return fixture?.startsWith("images-ocr-") ?? false;
}

function fixtureFor(request: NextRequest): string | null {
  return getConsumerRouteFixture(request.cookies.get("bookgolas-route-fixture")?.value);
}

function isFile(value: FormDataEntryValue | null): value is File {
  return value !== null && typeof value !== "string" && typeof value.arrayBuffer === "function" && typeof value.type === "string";
}

function textValue(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function nullablePage(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function nullableText(value: string): string | null {
  return value.trim() === "" ? null : value;
}

function responseForMutation(
  result: { image?: import("@/lib/product/contracts").BookImage; imageId?: string; duplicate?: boolean; ocr?: import("@/lib/product/contracts").ImageOcrOutcome },
  paths: string[],
  action: "upload" | "manual" | "retry_ocr" | "delete",
): ImagesOcrResponse | null {
  if (action === "delete") {
    const imageId = ImageIdSchema.safeParse(result.imageId);
    return imageId.success
      ? { kind: "deleted", imageId: imageId.data, invalidatedPaths: paths }
      : null;
  }
  return result.image && result.ocr
    ? { kind: "saved", image: result.image, duplicate: result.duplicate ?? false, ocr: result.ocr, invalidatedPaths: paths }
    : null;
}

export async function GET(request: NextRequest) {
  const bookId = BookIdSchema.safeParse(request.nextUrl.searchParams.get("bookId"));
  if (!bookId.success) return privateError(validationError());
  const fixture = fixtureFor(request);
  if (isImagesFixture(fixture)) {
    const result = getImagesOcrFixtureRecords(fixture!, bookId.data);
    return result.ok ? privateJson({ kind: "list", images: result.value }) : privateError(result.error);
  }
  const result = await listOwnedBookImagesWithSignedUrls(bookId.data);
  return result.ok ? privateJson({ kind: "list", images: result.value }) : privateError(result.error);
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const fixture = fixtureFor(request);
  if (contentType.toLowerCase().includes("multipart/form-data")) {
    const declaredLength = request.headers.get("content-length");
    if (declaredLength !== null && Number(declaredLength) > 8 * 1024 * 1024 + 64 * 1024) {
      return privateError(payloadTooLargeError("The image upload request is too large."));
    }
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return privateError(validationError("The image upload is invalid."));
    }
    const file = form.get("file");
    if (!isFile(file)) return privateError(validationError("An image file is required."));
    const bytes = new Uint8Array(await file.arrayBuffer());
    const metadata = ImagesOcrUploadMetadataSchema.safeParse({
      action: "upload",
      locale: textValue(form, "locale"),
      bookId: textValue(form, "bookId"),
      pageNumber: nullablePage(textValue(form, "pageNumber")),
      caption: nullableText(textValue(form, "caption")),
      ocrConsent: textValue(form, "ocrConsent") === "true",
      manualText: textValue(form, "manualText"),
      idempotencyKey: textValue(form, "idempotencyKey"),
    });
    if (!metadata.success) return privateError(validationError());
    const validation = validateBookImageBytes({ mimeType: file.type, byteLength: bytes.byteLength, bytes });
    if (!validation.ok) {
      return privateError(validation.reason === "oversize" ? payloadTooLargeError("Images must be 8 MiB or smaller.") : validationError("The image file is invalid."));
    }
    const paths = invalidatedPaths(metadata.data.locale, metadata.data.bookId);
    if (isImagesFixture(fixture)) {
      const result = applyImagesOcrFixtureMutation(fixture!, {
        action: "upload",
        bookId: metadata.data.bookId,
        mimeType: validation.mimeType,
        byteSize: bytes.byteLength,
        ocrConsent: metadata.data.ocrConsent,
        manualText: metadata.data.manualText,
        idempotencyKey: metadata.data.idempotencyKey,
      } satisfies ImagesOcrFixtureUpload);
      if (!result.ok) return privateError(result.error);
      const response = responseForMutation(result.value, paths, "upload");
      return response ? privateJson(response) : privateError(validationError());
    }
    const result = await uploadOwnedBookImage({
      ...metadata.data,
      fileName: file.name,
      mimeType: validation.mimeType,
      bytes,
    });
    if (!result.ok) return privateError(result.error);
    const response = responseForMutation(result.value, paths, "upload");
    if (!response) return privateError(validationError());
    revalidatePath(paths[0]);
    return privateJson(response);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return privateError(validationError());
  }
  const parsed = ImagesOcrJsonMutationSchema.safeParse(body);
  if (!parsed.success) return privateError(validationError());
  const input = parsed.data;
  const paths = invalidatedPaths(input.locale, input.bookId);
  if (isImagesFixture(fixture)) {
    const result = applyImagesOcrFixtureMutation(fixture!, input);
    if (!result.ok) return privateError(result.error);
    const response = responseForMutation(result.value, paths, input.action);
    if (!response) return privateError(validationError());
    return privateJson(response);
  }
  const result = input.action === "manual"
    ? await updateOwnedBookImageManualText(input)
    : input.action === "retry_ocr"
      ? await retryOwnedBookImageOcr(input)
      : await deleteOwnedBookImage(input);
  if (!result.ok) return privateError(result.error);
  const response = responseForMutation(result.value, paths, input.action);
  if (!response) return privateError(validationError());
  revalidatePath(paths[0]);
  return privateJson(response);
}
