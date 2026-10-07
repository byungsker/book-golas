export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Expose-Headers": "x-request-id",
};

const REQUEST_ID_HEADER = "x-request-id";
const INTERNAL_ERROR_CODE_HEADER = "x-edge-error-code";
const SAFE_CODE_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/;

export interface EdgeRequestContext {
  requestId: string;
}

export type EdgeRequestHandler = (
  req: Request,
  context: EdgeRequestContext,
) => Promise<Response>;

function normalizeErrorCode(errorCode: string): string {
  return SAFE_CODE_PATTERN.test(errorCode) ? errorCode : "internal_error";
}

function resolveRequestId(req: Request): string {
  const requestId = req.headers.get(REQUEST_ID_HEADER)?.trim() ?? "";
  return SAFE_REQUEST_ID_PATTERN.test(requestId)
    ? requestId
    : crypto.randomUUID();
}

export function requestIdFromRequest(req: Request): string {
  return resolveRequestId(req);
}

function fallbackErrorCode(status: number): string {
  if (status >= 500) {
    return "internal_error";
  }
  if (status >= 400) {
    return `http_${status}`;
  }
  return "ok";
}

function addResponseMetadata(response: Response, requestId: string): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeaders)) {
    headers.set(name, value);
  }
  headers.set(REQUEST_ID_HEADER, requestId);
  headers.delete(INTERNAL_ERROR_CODE_HEADER);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  context: EdgeRequestContext,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      [REQUEST_ID_HEADER]: context.requestId,
    },
  });
}

export function errorResponse(
  context: EdgeRequestContext,
  errorCode: string,
  status: number,
  message: string,
): Response {
  const response = jsonResponse({ error: message }, status, context);
  response.headers.set(
    INTERNAL_ERROR_CODE_HEADER,
    normalizeErrorCode(errorCode),
  );
  return response;
}

export function withEdgeFunction(
  functionName: string,
  handler: EdgeRequestHandler,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const requestId = resolveRequestId(req);
    const startedAt = performance.now();
    const context = { requestId };
    let response: Response;

    if (req.method === "OPTIONS") {
      response = new Response(null, { status: 204, headers: corsHeaders });
    } else {
      try {
        response = await handler(req, context);
      } catch {
        response = errorResponse(
          context,
          "internal_error",
          500,
          "Internal server error",
        );
      }
    }

    const errorCode = normalizeErrorCode(
      response.headers.get(INTERNAL_ERROR_CODE_HEADER) ??
        fallbackErrorCode(response.status),
    );
    const finalizedResponse = addResponseMetadata(response, requestId);
    const latencyMs = Math.min(
      Math.max(0, Math.round(performance.now() - startedAt)),
      2_147_483_647,
    );
    const severity = finalizedResponse.status >= 500
      ? "error"
      : finalizedResponse.status >= 400
      ? "warn"
      : "info";

    console.log(JSON.stringify({
      eventVersion: 1,
      event: "edge_function_request",
      surface: "supabase_edge_function",
      severity,
      sampled: true,
      functionName,
      requestId,
      status: finalizedResponse.status,
      latencyMs,
      errorCode,
    }));

    return finalizedResponse;
  };
}
