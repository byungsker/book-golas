import {
  type AgentErrorBody,
  type AgentResponse,
  API_VERSION,
  CAPABILITY_CATALOG,
  type CapabilityId,
  type CapabilityManifest,
  type CapabilityResponse,
  CONTRACT_VERSION,
  DEFAULT_PAGE_SIZE,
  type JsonValue,
  MAX_PAGE_SIZE,
  type PageResult,
} from "./contracts.ts";
import {
  AuthenticationError,
  type Authenticator,
  getBearerToken,
} from "./auth.ts";
import { type AgentReadDataSource, DataSourceError } from "./data-source.ts";
import { InMemoryQuotaController, type QuotaController } from "./quota.ts";

interface Dependencies {
  authenticator: Authenticator;
  dataSource: AgentReadDataSource;
  quota?: QuotaController;
  now?: () => number;
  requestId?: () => string;
}

interface RouteContext {
  request: Request;
  requestId: string;
  token: string;
  userId: string;
  capability: CapabilityId;
}

const catalogByPath: Map<string, (typeof CAPABILITY_CATALOG)[number]> = new Map(
  CAPABILITY_CATALOG.map((item) => [item.path, item]),
);

function jsonHeaders(requestId: string): Headers {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Request-ID": requestId,
  });
  return headers;
}

function errorResponse(
  requestId: string,
  status: number,
  code: string,
  message: string,
  retryable: boolean,
  details?: Record<string, JsonValue>,
  extraHeaders?: HeadersInit,
): Response {
  const body: AgentErrorBody = {
    error: {
      code,
      message,
      request_id: requestId,
      retryable,
      ...(details ? { details } : {}),
    },
  };
  const headers = jsonHeaders(requestId);
  for (const [key, value] of new Headers(extraHeaders)) headers.set(key, value);
  return new Response(JSON.stringify(body), { status, headers });
}

function response<T>(
  requestId: string,
  capability: CapabilityId,
  data: T,
  pagination?: {
    page: number;
    page_size: number;
    has_more: boolean;
    total: number | null;
  },
): Response {
  const body: AgentResponse<T> = {
    data,
    meta: {
      api_version: API_VERSION,
      contract_version: CONTRACT_VERSION,
      request_id: requestId,
      generated_at: new Date().toISOString(),
      ...(pagination ? { pagination } : {}),
      usage: {
        capability,
        units: 1,
        attribution: "authenticated_user",
        ledger: "shared_bookgolas_account",
        provider_cost_incurred: false,
      },
    },
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: jsonHeaders(requestId),
  });
}

function parsePage(
  request: Request,
  requestId: string,
): { page: number; pageSize: number } | Response {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(
    url.searchParams.get("page_size") ?? String(DEFAULT_PAGE_SIZE),
  );
  if (!Number.isInteger(page) || page < 1 || page > 10_000) {
    return errorResponse(
      requestId,
      400,
      "invalid_pagination",
      "page must be an integer between 1 and 10000",
      false,
    );
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    return errorResponse(
      requestId,
      400,
      "invalid_pagination",
      `page_size must be between 1 and ${MAX_PAGE_SIZE}`,
      false,
    );
  }
  return { page, pageSize };
}

function hasMore<T>(
  result: PageResult<T>,
  page: number,
  pageSize: number,
): boolean {
  return result.total === null
    ? result.items.length === pageSize
    : page * pageSize < result.total;
}

function withQuotaHeaders(
  responseValue: Response,
  resetAt: string,
  remaining: number,
): Response {
  responseValue.headers.set("X-RateLimit-Limit", "60");
  responseValue.headers.set("X-RateLimit-Remaining", String(remaining));
  responseValue.headers.set("X-RateLimit-Reset", resetAt);
  return responseValue;
}

async function handleRoute(
  context: RouteContext,
  dependencies: Dependencies,
): Promise<Response> {
  const { request, requestId, token, userId, capability } = context;
  const url = new URL(request.url);
  if (url.searchParams.has("user_id")) {
    return errorResponse(
      requestId,
      400,
      "user_scope_forbidden",
      "user_id is derived from the access token",
      false,
    );
  }

  const quota = (dependencies.quota ?? new InMemoryQuotaController()).consume(
    userId,
    capability,
    dependencies.now?.() ?? Date.now(),
  );
  if (!quota.allowed) {
    return errorResponse(
      requestId,
      429,
      "rate_limited",
      "The per-user Agent API rate limit was reached",
      true,
      { reset_at: quota.reset_at },
      { "Retry-After": "60" },
    );
  }

  const pagination = parsePage(request, requestId);
  if (pagination instanceof Response) return pagination;
  const { page, pageSize } = pagination;
  const signal = AbortSignal.timeout(10_000);
  try {
    let result: PageResult<unknown> | null = null;
    if (url.pathname === "/v1/books/search") {
      const query = url.searchParams.get("q")?.trim() ?? "";
      if (!query || query.length > 200) {
        return errorResponse(
          requestId,
          400,
          "invalid_query",
          "q is required and must be at most 200 characters",
          false,
        );
      }
      result = await dependencies.dataSource.searchBooks(
        userId,
        token,
        query,
        page,
        pageSize,
        signal,
      );
    } else if (url.pathname === "/v1/library") {
      result = await dependencies.dataSource.listLibrary(
        userId,
        token,
        page,
        pageSize,
        signal,
      );
    } else if (url.pathname === "/v1/reading-progress") {
      result = await dependencies.dataSource.listProgress(
        userId,
        token,
        url.searchParams.get("book_id"),
        page,
        pageSize,
        signal,
      );
    } else if (url.pathname === "/v1/recall") {
      result = await dependencies.dataSource.listRecall(
        userId,
        token,
        url.searchParams.get("book_id"),
        page,
        pageSize,
        signal,
      );
    } else if (url.pathname === "/v1/insights") {
      result = await dependencies.dataSource.listInsights(
        userId,
        token,
        page,
        pageSize,
        signal,
      );
    }
    if (!result) {
      return errorResponse(
        requestId,
        404,
        "not_found",
        "Agent API route was not found",
        false,
      );
    }
    return withQuotaHeaders(
      response(requestId, capability, { items: result.items }, {
        page,
        page_size: pageSize,
        has_more: hasMore(result, page, pageSize),
        total: result.total,
      }),
      quota.reset_at,
      quota.remaining,
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return errorResponse(
        requestId,
        504,
        "upstream_timeout",
        "The data provider timed out",
        true,
      );
    }
    if (error instanceof DataSourceError) {
      const code = error.status === 403
        ? "resource_forbidden"
        : error.status === 429
        ? "upstream_rate_limited"
        : error.status === 503
        ? "upstream_unavailable"
        : "upstream_error";
      return errorResponse(
        requestId,
        error.status,
        code,
        error.message,
        error.retryable,
      );
    }
    return errorResponse(
      requestId,
      500,
      "internal_error",
      "The Agent API could not complete the request",
      false,
    );
  }
}

export function createAgentApiHandler(
  input: Dependencies,
): (request: Request) => Promise<Response> {
  const dependencies = {
    ...input,
    quota: input.quota ?? new InMemoryQuotaController(),
  };
  return async (request: Request): Promise<Response> => {
    const requestId = dependencies.requestId?.() ?? crypto.randomUUID();
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: jsonHeaders(requestId),
      });
    }
    if (url.pathname === "/v1/capabilities" && request.method === "GET") {
      const manifest: CapabilityManifest = {
        api_version: API_VERSION,
        contract_version: CONTRACT_VERSION,
        name: "bookgolas-agent-api",
        mode: "read_only",
        capabilities: CAPABILITY_CATALOG,
        writes: {
          enabled: false,
          approval_required: true,
          dry_run_required: true,
          idempotency_required: true,
          postcondition_evidence_required: true,
        },
      };
      return new Response(
        JSON.stringify(
          {
            data: manifest,
            meta: {
              api_version: API_VERSION,
              contract_version: CONTRACT_VERSION,
              request_id: requestId,
              generated_at: new Date().toISOString(),
            },
          } satisfies CapabilityResponse,
        ),
        { status: 200, headers: jsonHeaders(requestId) },
      );
    }
    const catalogItem = catalogByPath.get(url.pathname);
    if (!catalogItem) {
      return errorResponse(
        requestId,
        404,
        "not_found",
        "Agent API route was not found",
        false,
      );
    }
    if (request.method !== "GET") {
      return errorResponse(
        requestId,
        405,
        "write_disabled",
        "Write commands are disabled in Agent API 0.1.0",
        false,
        {
          allowed_method: "GET",
          dry_run_required: true,
          approval_required: true,
          idempotency_required: true,
          postcondition_evidence_required: true,
        },
        { Allow: "GET" },
      );
    }
    const token = getBearerToken(request);
    if (!token) {
      return errorResponse(
        requestId,
        401,
        "authentication_required",
        "A Bearer access token is required",
        false,
      );
    }
    try {
      const user = await dependencies.authenticator.verify(
        token,
        AbortSignal.timeout(10_000),
      );
      return await handleRoute({
        request,
        requestId,
        token,
        userId: user.id,
        capability: catalogItem.id,
      }, dependencies);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return errorResponse(
          requestId,
          error.status,
          error.status === 401
            ? "authentication_required"
            : "authentication_unavailable",
          error.message,
          error.retryable,
        );
      }
      if (error instanceof DOMException && error.name === "TimeoutError") {
        return errorResponse(
          requestId,
          504,
          "authentication_timeout",
          "Authentication provider timed out",
          true,
        );
      }
      return errorResponse(
        requestId,
        503,
        "authentication_unavailable",
        "Authentication provider is unavailable",
        true,
      );
    }
  };
}
