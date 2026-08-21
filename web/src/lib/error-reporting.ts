const REQUEST_ID_HEADER = "x-request-id";
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/;
const SAFE_CODE_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const SAFE_ROUTE_PATTERN = /^\/[A-Za-z0-9._~:/?&=+%{}-]{1,160}$/;

export const WEB_ERROR_SAMPLE_RATE = 1;

export type WebErrorSeverity = "warn" | "error";

export interface WebErrorInput {
  route: string;
  errorCode: string;
  status: number;
  severity?: WebErrorSeverity;
}

export interface WebErrorEvent {
  eventVersion: 1;
  event: "web_error";
  surface: "next_admin_api";
  severity: WebErrorSeverity;
  sampled: true;
  sampleRate: 1;
  requestId: string;
  route: string;
  errorCode: string;
  status: number;
}

function resolveRequestId(request: Request): string {
  const requestId = request.headers.get(REQUEST_ID_HEADER)?.trim() ?? "";
  return SAFE_REQUEST_ID_PATTERN.test(requestId)
    ? requestId
    : globalThis.crypto.randomUUID();
}

function normalizeRoute(route: string): string {
  return SAFE_ROUTE_PATTERN.test(route) ? route : "/unknown";
}

function normalizeErrorCode(errorCode: string): string {
  return SAFE_CODE_PATTERN.test(errorCode) ? errorCode : "internal_error";
}

function normalizeStatus(status: number): number {
  return Number.isInteger(status) && status >= 100 && status <= 599
    ? status
    : 500;
}

export function buildWebErrorEvent(
  request: Request,
  input: WebErrorInput,
): WebErrorEvent {
  return {
    eventVersion: 1,
    event: "web_error",
    surface: "next_admin_api",
    severity: input.severity ?? "error",
    sampled: true,
    sampleRate: WEB_ERROR_SAMPLE_RATE,
    requestId: resolveRequestId(request),
    route: normalizeRoute(input.route),
    errorCode: normalizeErrorCode(input.errorCode),
    status: normalizeStatus(input.status),
  };
}

export function captureWebError(
  request: Request,
  input: WebErrorInput,
): string {
  const event = buildWebErrorEvent(request, input);
  console.error(JSON.stringify(event));
  return event.requestId;
}
