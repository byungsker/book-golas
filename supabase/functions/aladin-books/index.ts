import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  ContractError,
  createServiceClient,
  enforceFunctionRateLimit,
  fetchProvider,
  jsonResponse,
  methodGuard,
  optionsResponse,
  parseJsonBody,
  providerFailure,
  requireProviderSecret,
  requireString,
  requireUser,
  responseForError,
} from "../_shared/consumer-contract.ts";

const MAX_RESULTS = 10;

interface AladinItem {
  title?: string;
  author?: string;
  cover?: string;
  isbn?: string;
  isbn13?: string;
  publisher?: string;
  categoryName?: string;
  link?: string;
  priceStandard?: number;
  priceSales?: number;
  subInfo?: { itemPage?: number };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse(req);

  try {
    methodGuard(req);
    const { user } = await requireUser(req);
    const body = await parseJsonBody(req);
    const query = body.query === undefined ? undefined : requireString(body, "query", 200, false);
    const isbn = body.isbn === undefined ? undefined : requireString(body, "isbn", 32, false);
    if (!query && !isbn) throw new ContractError(400, "invalid_request", "query or isbn is required");
    if (query && isbn) throw new ContractError(400, "invalid_request", "query and isbn cannot be combined");

    const serviceClient = createServiceClient();
    await enforceFunctionRateLimit(serviceClient, user.id, "aladin-books", 30, 60);
    const apiKey = requireProviderSecret("ALADIN_TTB_KEY");
    const url = new URL("https://www.aladin.co.kr/ttb/api/ItemSearch.aspx");
    url.searchParams.set("ttbkey", apiKey);
    url.searchParams.set("Query", isbn ?? query ?? "");
    url.searchParams.set("QueryType", isbn ? "ISBN" : "Keyword");
    url.searchParams.set("MaxResults", String(MAX_RESULTS));
    url.searchParams.set("SearchTarget", "Book");
    url.searchParams.set("output", "js");
    url.searchParams.set("Version", "20131101");
    url.searchParams.set("Cover", "Big");

    const response = await fetchProvider(url, { method: "GET" }, 8_000, 512 * 1024);
    if (!response.ok) throw new Error(`provider_status:${response.status}`);
    const payload: unknown = await response.json();
    const items = payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>).item
      : undefined;
    if (!Array.isArray(items)) throw new Error("provider_invalid_response");

    const books = items.slice(0, MAX_RESULTS).map((item): Record<string, unknown> => {
      const row = item as AladinItem;
      return {
        title: row.title ?? "",
        author: row.author ?? "",
        cover: row.cover ?? null,
        isbn: row.isbn13 ?? row.isbn ?? null,
        publisher: row.publisher ?? null,
        genre: row.categoryName ?? null,
        link: row.link ?? null,
        totalPages: row.subInfo?.itemPage ?? null,
        price: row.priceStandard ?? row.priceSales ?? null,
      };
    });
    return jsonResponse({ books }, req);
  } catch (error) {
    if (error instanceof ContractError) return responseForError(error, req, "aladin-books");
    return responseForError(providerFailure(error), req, "aladin-books");
  }
});
