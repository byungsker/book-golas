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
  imageBase64?: string;
};

type HandlerDependencies = {
  apiKey: string;
  authenticate: (request: Request) => Promise<string | null>;
  hasConsent: (request: Request, userId: string) => Promise<boolean>;
  fetchUpstream: typeof fetch;
};

function jsonResponse(
  body: unknown,
  status: number,
  requestId: string,
): Response {
  const responseBody = body !== null && typeof body === "object" &&
      !Array.isArray(body)
    ? { ...(body as Record<string, unknown>), requestId }
    : { data: body, requestId };
  return new Response(JSON.stringify(responseBody), {
    status,
    headers: { ...jsonHeaders, "X-Request-Id": requestId },
  });
}

export function createHandler(
  dependencies: HandlerDependencies,
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const requestId = crypto.randomUUID();
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405, requestId);
    }
    if (!dependencies.apiKey) {
      return jsonResponse(
        { error: "Service configuration unavailable" },
        503,
        requestId,
      );
    }
    const userId = await dependencies.authenticate(request);
    if (userId == null) {
      return jsonResponse({ error: "Unauthorized" }, 401, requestId);
    }
    if (!(await dependencies.hasConsent(request, userId))) {
      return jsonResponse(
        { error: "third_party_ai_consent_required" },
        403,
        requestId,
      );
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 11_300_000) {
      return jsonResponse({ error: "Invalid image" }, 400, requestId);
    }

    let body: RequestBody;
    try {
      body = (await request.json()) as RequestBody;
    } catch {
      return jsonResponse({ error: "Invalid request" }, 400, requestId);
    }

    const { imageBase64 } = body;
    if (
      !imageBase64 ||
      imageBase64.length > 11_200_000 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)
    ) {
      return jsonResponse({ error: "Invalid image" }, 400, requestId);
    }

    try {
      const upstream = await dependencies.fetchUpstream(
        `https://us-vision.googleapis.com/v1/images:annotate?key=${dependencies.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                image: { content: imageBase64 },
                features: [
                  { type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 },
                ],
                imageContext: { languageHints: ["ko", "en"] },
              },
            ],
          }),
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!upstream.ok) {
        return jsonResponse(
          { error: "OCR service unavailable" },
          502,
          requestId,
        );
      }

      const data = await upstream.json();
      const result = data.responses?.[0];
      if (result?.error) {
        return jsonResponse({ error: "OCR service failed" }, 502, requestId);
      }

      const text = result?.fullTextAnnotation?.text ??
        result?.textAnnotations?.[0]?.description ??
        "";
      return jsonResponse({ text }, 200, requestId);
    } catch {
      return jsonResponse({ error: "OCR request failed" }, 502, requestId);
    }
  };
}
