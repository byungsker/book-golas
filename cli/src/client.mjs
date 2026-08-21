export const EXIT_CODES = Object.freeze({
  ok: 0,
  usage: 2,
  authentication: 3,
  forbidden: 4,
  upstream: 5,
  timeout: 6,
  rateLimited: 7,
  unexpected: 8,
});

export class CliError extends Error {
  constructor(message, code, exitCode, retryable = false) {
    super(message);
    this.name = "CliError";
    this.code = code;
    this.exitCode = exitCode;
    this.retryable = retryable;
  }
}

export function boundedInteger(value, fallback, min, max) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new CliError(`Expected an integer between ${min} and ${max}`, "invalid_argument", EXIT_CODES.usage);
  }
  return parsed;
}

function responseError(response, body) {
  const error = body?.error;
  const code = typeof error?.code === "string" ? error.code : "upstream_error";
  const message = typeof error?.message === "string" ? error.message : `Agent API returned HTTP ${response.status}`;
  if (response.status === 401) return new CliError(message, code, EXIT_CODES.authentication, false);
  if (response.status === 403 || response.status === 405) return new CliError(message, code, EXIT_CODES.forbidden, false);
  if (response.status === 429) return new CliError(message, code, EXIT_CODES.rateLimited, true);
  if (response.status === 408 || response.status >= 500) return new CliError(message, code, EXIT_CODES.upstream, true);
  return new CliError(message, code, EXIT_CODES.upstream, Boolean(error?.retryable));
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (!signal) return;
    const abort = () => {
      clearTimeout(timer);
      reject(new CliError("The request was cancelled", "cancelled", EXIT_CODES.timeout));
    };
    if (signal.aborted) abort();
    signal.addEventListener("abort", abort, { once: true });
  });
}

function requestSignal(externalSignal, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), timeoutMs);
  const abort = () => controller.abort(externalSignal?.reason ?? new DOMException("Request cancelled", "AbortError"));
  externalSignal?.addEventListener("abort", abort, { once: true });
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timeout);
      externalSignal?.removeEventListener("abort", abort);
    },
  };
}

export function createApiClient({
  baseUrl,
  token,
  fetchImpl = fetch,
  timeoutMs = 10_000,
  maxRetries = 2,
  sleepImpl = sleep,
} = {}) {
  if (!baseUrl) throw new CliError("BOOKGOLAS_API_URL is required", "missing_configuration", EXIT_CODES.usage);
  const url = new URL(baseUrl);
  if (!/^https?:$/.test(url.protocol)) throw new CliError("BOOKGOLAS_API_URL must use http or https", "invalid_configuration", EXIT_CODES.usage);
  const safeRetries = boundedInteger(String(maxRetries), 2, 0, 3);
  const safeTimeout = boundedInteger(String(timeoutMs), 10_000, 100, 60_000);

  return {
    async get(path, params = {}, signal) {
      const target = new URL(path, url);
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") target.searchParams.set(key, String(value));
      }
      let attempt = 0;
      while (true) {
        const request = requestSignal(signal, safeTimeout);
        try {
          const headers = { Accept: "application/json" };
          if (token) headers.Authorization = `Bearer ${token}`;
          const response = await fetchImpl(target, { method: "GET", headers, signal: request.signal });
          const body = await response.json().catch(() => null);
          if (response.ok) return body;
          const error = responseError(response, body);
          if (!error.retryable || attempt >= safeRetries) throw error;
          attempt += 1;
          await sleepImpl(200 * (2 ** (attempt - 1)), signal);
        } catch (error) {
          if (error instanceof CliError) {
            if (!error.retryable || attempt >= safeRetries) throw error;
            attempt += 1;
            await sleepImpl(200 * (2 ** (attempt - 1)), signal);
          } else if (error?.name === "TimeoutError" || error?.name === "AbortError") {
            throw new CliError("The Agent API request timed out", "timeout", EXIT_CODES.timeout, false);
          } else {
            if (attempt >= safeRetries) throw new CliError("The Agent API request failed", "network_error", EXIT_CODES.upstream, true);
            attempt += 1;
            await sleepImpl(200 * (2 ** (attempt - 1)), signal);
          }
        } finally {
          request.dispose();
        }
      }
    },
  };
}
