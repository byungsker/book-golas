const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

type RequestBody = {
  action?: "search" | "lookup";
  query?: string;
  isbn?: string;
  maxResults?: number;
};

type HandlerDependencies = {
  apiKey: string;
  authenticate: (request: Request) => Promise<boolean>;
  fetchUpstream: typeof fetch;
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

export function createHandler(
  dependencies: HandlerDependencies,
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }
    if (!dependencies.apiKey) {
      return jsonResponse({ error: "Service configuration unavailable" }, 503);
    }
    if (!(await dependencies.authenticate(request))) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    let body: RequestBody;
    try {
      body = (await request.json()) as RequestBody;
    } catch {
      return jsonResponse({ error: "Invalid request" }, 400);
    }

    const params = new URLSearchParams({
      ttbkey: dependencies.apiKey,
      output: "js",
      Version: "20131101",
      Cover: "Big",
    });
    let endpoint: string;

    if (body.action === "search") {
      const query = body.query?.trim() ?? "";
      if (!query || query.length > 200) {
        return jsonResponse({ error: "Invalid query" }, 400);
      }
      const requestedResults = Number(body.maxResults ?? 10);
      if (!Number.isFinite(requestedResults)) {
        return jsonResponse({ error: "Invalid result count" }, 400);
      }
      const maxResults = Math.min(
        Math.max(Math.trunc(requestedResults), 1),
        10,
      );
      endpoint = "https://www.aladin.co.kr/ttb/api/ItemSearch.aspx";
      params.set("Query", query);
      params.set("QueryType", "Title");
      params.set("MaxResults", maxResults.toString());
      params.set("start", "1");
      params.set("SearchTarget", "Book");
    } else if (body.action === "lookup") {
      const isbn = (body.isbn ?? "").replaceAll(/[^0-9Xx]/g, "");
      if (!/^(?:[0-9]{10}|[0-9]{13})$/.test(isbn)) {
        return jsonResponse({ error: "Invalid ISBN" }, 400);
      }
      endpoint = "https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx";
      params.set("itemIdType", isbn.length === 13 ? "ISBN13" : "ISBN");
      params.set("ItemId", isbn);
      params.set("OptResult", "ebookList,usedList,reviewList");
    } else {
      return jsonResponse({ error: "Invalid action" }, 400);
    }

    try {
      const upstream = await dependencies.fetchUpstream(
        `${endpoint}?${params.toString()}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!upstream.ok) {
        return jsonResponse({ error: "Book service unavailable" }, 502);
      }
      return jsonResponse(await upstream.json(), 200);
    } catch {
      return jsonResponse({ error: "Book service request failed" }, 502);
    }
  };
}
