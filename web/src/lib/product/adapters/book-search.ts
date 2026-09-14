import "server-only";

import {
  BookSearchRequestSchema,
  BookSearchResultSchema,
  type BookSearchRequest,
  type BookSearchResult,
} from "@/lib/product/contracts";
import {
  failure,
  offlineError,
  providerError,
  rateLimitedError,
  success,
  timeoutError,
  unavailableError,
  validationError,
  type ProductResult,
} from "@/lib/product/dal/errors";
import {
  AladinBooksResponseSchema,
  GoogleBooksPayloadSchema,
} from "./contracts";
import { invokeProductFunction, type ProductFunctionOptions } from "./functions";
import { getProviderConfig } from "./provider-config";

const googleBooksEndpoint = "https://www.googleapis.com/books/v1/volumes";

type FetchLike = typeof fetch;

function normalizeAladinBook(value: unknown): BookSearchResult | undefined {
  const parsed = BookSearchResultSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function normalizeGoogleBook(item: {
  selfLink?: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    publisher?: string;
    pageCount?: number;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
    categories?: string[];
  };
}): BookSearchResult | undefined {
  const volume = item.volumeInfo;
  const title = volume.title?.trim();
  if (!title) return undefined;

  const author = volume.authors?.filter(Boolean).join(", ").trim() || "Unknown author";
  const imageUrl = volume.imageLinks?.thumbnail ?? volume.imageLinks?.smallThumbnail ?? null;
  const isbn =
    volume.industryIdentifiers?.find((identifier) => identifier.type === "ISBN_13")?.identifier ??
    volume.industryIdentifiers?.find((identifier) => identifier.type === "ISBN_10")?.identifier ??
    null;

  const result = BookSearchResultSchema.safeParse({
    title,
    author,
    imageUrl,
    totalPages: volume.pageCount && volume.pageCount > 0 ? volume.pageCount : null,
    isbn,
    genre: volume.categories?.find(Boolean) ?? null,
    publisher: volume.publisher?.trim() || null,
    aladinUrl: item.selfLink ?? null,
    price: null,
  });
  return result.success ? result.data : undefined;
}

function parseSearchRequest(request: BookSearchRequest): ProductResult<BookSearchRequest> {
  const parsed = BookSearchRequestSchema.safeParse(request);
  return parsed.success ? success(parsed.data) : failure(validationError());
}

function providerResponseError(status: number): ProductResult<never> {
  if (status === 429) return failure(rateLimitedError("Book provider rate limit exceeded."));
  if (status === 408 || status === 504) return failure(timeoutError());
  if (status === 401 || status === 403) {
    return failure(providerError("Book provider credentials were rejected."));
  }
  return failure(providerError(`Book provider returned HTTP ${status}.`));
}

function isLikelyTimeout(error: unknown): boolean {
  return error instanceof Error && (
    error.name === "AbortError" ||
    error.name === "TimeoutError" ||
    /timed?\s*out|timeout/i.test(error.message)
  );
}

async function fetchGoogleBooks(
  request: BookSearchRequest,
  fetchImpl: FetchLike = fetch,
  timeoutMs = 8_000,
): Promise<ProductResult<BookSearchResult[]>> {
  const config = getProviderConfig();
  const url = new URL(googleBooksEndpoint);
  const query = request.query.trim();
  const compact = query.replace(/[\s-]/g, "");
  url.searchParams.set(
    "q",
    /^(?:\d{10}|\d{13})$/.test(compact) ? `isbn:${compact}` : query,
  );
  url.searchParams.set("maxResults", String(Math.min(request.pagination.limit, 40)));
  url.searchParams.set("langRestrict", "en");
  url.searchParams.set("printType", "books");
  if (config.googleBooksApiKey) url.searchParams.set("key", config.googleBooksApiKey);

  let response: Response;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      response = await fetchImpl(url, { method: "GET", signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    return failure(isLikelyTimeout(error) ? timeoutError() : offlineError("Book search is offline."));
  }

  if (!response.ok) return providerResponseError(response.status);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return failure(unavailableError("The book provider returned malformed data."));
  }
  const parsed = GoogleBooksPayloadSchema.safeParse(payload);
  if (!parsed.success) return failure(unavailableError("The book provider returned malformed data."));

  return success(
    parsed.data.items
      .map(normalizeGoogleBook)
      .filter((book): book is BookSearchResult => book !== undefined),
  );
}

export async function searchAladinBooks(
  request: BookSearchRequest,
  options: ProductFunctionOptions = {},
): Promise<ProductResult<BookSearchResult[]>> {
  const parsedRequest = parseSearchRequest(request);
  if (!parsedRequest.ok) return failure(parsedRequest.error);

  const response = await invokeProductFunction(
    "aladin-books",
    (() => {
      const compact = parsedRequest.value.query.replace(/[\s-]/g, "");
      return /^(?:\d{10}|\d{13})$/.test(compact)
        ? { isbn: compact }
        : { query: parsedRequest.value.query };
    })(),
    AladinBooksResponseSchema,
    options,
  );
  if (!response.ok) return failure(response.error);

  const books = response.value.books
    .map((book) => normalizeAladinBook({
      title: book.title,
      author: book.author.trim() || "Unknown author",
      imageUrl: book.cover,
      totalPages: book.totalPages,
      isbn: book.isbn,
      genre: book.genre,
      publisher: book.publisher,
      aladinUrl: book.link,
      price: book.price,
    }))
    .filter((book): book is BookSearchResult => book !== undefined);
  return success(books);
}

export async function searchGoogleBooks(
  request: BookSearchRequest,
  fetchImpl: FetchLike = fetch,
  timeoutMs = 8_000,
): Promise<ProductResult<BookSearchResult[]>> {
  const parsedRequest = parseSearchRequest(request);
  if (!parsedRequest.ok) return failure(parsedRequest.error);
  return fetchGoogleBooks(parsedRequest.value, fetchImpl, timeoutMs);
}

/** Locale routing mirrors the native service while keeping every credential server-side. */
export async function searchBooks(
  request: BookSearchRequest,
  options: ProductFunctionOptions & { fetch?: FetchLike; timeoutMs?: number } = {},
): Promise<ProductResult<BookSearchResult[]>> {
  const parsedRequest = parseSearchRequest(request);
  if (!parsedRequest.ok) return failure(parsedRequest.error);
  if (parsedRequest.value.locale === "ko") return searchAladinBooks(parsedRequest.value, options);
  return searchGoogleBooks(parsedRequest.value, options.fetch ?? fetch, options.timeoutMs);
}
