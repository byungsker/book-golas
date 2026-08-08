export type GrowthMetrics = {
  total_users: number;
  new_users_7d: number;
  active_users_7d: number;
  total_books: number;
  books_created_7d: number;
  users_with_books: number;
  total_reading_records: number;
  reading_records_7d: number;
  users_with_reading_records: number;
  total_ai_recalls: number;
  ai_recalls_7d: number;
  users_with_ai_recall: number;
};

type HandlerDependencies = {
  productId: string;
  environment: "development" | "production";
  expectedToken: string;
  loadMetrics: () => Promise<GrowthMetrics>;
  now: () => Date;
};

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const metricKeys = [
  "total_users",
  "new_users_7d",
  "active_users_7d",
  "total_books",
  "books_created_7d",
  "users_with_books",
  "total_reading_records",
  "reading_records_7d",
  "users_with_reading_records",
  "total_ai_recalls",
  "ai_recalls_7d",
  "users_with_ai_recall",
] as const;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

async function isAuthorized(
  request: Request,
  expectedToken: string,
): Promise<boolean> {
  if (expectedToken.length < 32) return false;
  const supplied = request.headers.get("Authorization")
    ?.replace(/^Bearer\s+/i, "") ?? "";
  if (supplied.length < 32) return false;
  return timingSafeEqual(await digest(supplied), await digest(expectedToken));
}

function validMetrics(value: GrowthMetrics): boolean {
  const keys = Object.keys(value);
  if (
    keys.length !== metricKeys.length ||
    !metricKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  ) {
    return false;
  }

  return metricKeys.every((key) =>
    Number.isSafeInteger(value[key]) &&
    value[key] >= 0 &&
    value[key] <= 1_000_000_000
  );
}

export function createHandler(
  dependencies: HandlerDependencies,
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    if (request.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }
    if (!(await isAuthorized(request, dependencies.expectedToken))) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    try {
      const metrics = await dependencies.loadMetrics();
      if (!validMetrics(metrics)) {
        return jsonResponse({ error: "Metrics unavailable" }, 503);
      }
      return jsonResponse(
        {
          schema_version: 1,
          product_id: dependencies.productId,
          generated_at: dependencies.now().toISOString(),
          admin: {
            status: "operational",
            environment: dependencies.environment,
            scope: "aggregate_metrics_only",
          },
          analytics: {
            provider: "supabase",
            period_days: 7,
            metrics,
          },
        },
        200,
      );
    } catch {
      return jsonResponse({ error: "Metrics unavailable" }, 503);
    }
  };
}
