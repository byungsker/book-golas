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

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 11_300_000) {
      return jsonResponse({ error: "Invalid image" }, 400);
    }

    let body: RequestBody;
    try {
      body = (await request.json()) as RequestBody;
    } catch {
      return jsonResponse({ error: "Invalid request" }, 400);
    }

    const { imageBase64 } = body;
    if (
      !imageBase64 ||
      imageBase64.length > 11_200_000 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)
    ) {
      return jsonResponse({ error: "Invalid image" }, 400);
    }

    try {
      const upstream = await dependencies.fetchUpstream(
        `https://vision.googleapis.com/v1/images:annotate?key=${dependencies.apiKey}`,
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
        return jsonResponse({ error: "OCR service unavailable" }, 502);
      }

      const data = await upstream.json();
      const result = data.responses?.[0];
      if (result?.error) {
        return jsonResponse({ error: "OCR service failed" }, 502);
      }

      const text = result?.fullTextAnnotation?.text ??
        result?.textAnnotations?.[0]?.description ??
        "";
      return jsonResponse({ text }, 200);
    } catch {
      return jsonResponse({ error: "OCR request failed" }, 502);
    }
  };
}
