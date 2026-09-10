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
  requireConsent,
  requireOwnedBook,
  requireOwnedSource,
  requireProviderSecret,
  requireString,
  requireUuid,
  requireUser,
  responseForError,
} from "../_shared/consumer-contract.ts";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse(req);

  try {
    methodGuard(req);
    const { user } = await requireUser(req);
    const body = await parseJsonBody(req, 8 * 1024 * 1024);
    const bookId = requireUuid(body, "bookId") ?? "";
    const imageId = requireUuid(body, "imageId") ?? "";
    const imageBase64 = requireString(body, "imageBase64", MAX_IMAGE_BYTES * 2) ?? "";
    if (!/^[A-Za-z0-9+/=]+$/.test(imageBase64)) {
      throw new ContractError(400, "invalid_request", "imageBase64 must be base64 encoded");
    }
    const decodedSize = Math.floor((imageBase64.replace(/=+$/, "").length * 3) / 4);
    if (decodedSize > MAX_IMAGE_BYTES) {
      throw new ContractError(413, "payload_too_large", "Image is too large");
    }

    const serviceClient = createServiceClient();
    await requireOwnedBook(serviceClient, user.id, bookId);
    await requireOwnedSource(serviceClient, user.id, bookId, imageId);
    await requireConsent(serviceClient, user, "ocr");
    await enforceFunctionRateLimit(serviceClient, user.id, "vision-ocr", 10, 24 * 60 * 60, "quota_exceeded");

    const apiKey = requireProviderSecret("GOOGLE_CLOUD_VISION_API_KEY");
    const response = await fetchProvider(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{ image: { content: imageBase64 }, features: [{ type: "TEXT_DETECTION", maxResults: 1 }] }],
      }),
    }, 15_000, 8 * 1024 * 1024);
    if (!response.ok) throw new Error(`provider_status:${response.status}`);
    const payload: unknown = await response.json();
    const responses = payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>).responses
      : undefined;
    const first = Array.isArray(responses) && responses[0] && typeof responses[0] === "object"
      ? responses[0] as Record<string, unknown>
      : undefined;
    const textAnnotations = first?.textAnnotations;
    const firstAnnotation = Array.isArray(textAnnotations) && textAnnotations[0] && typeof textAnnotations[0] === "object"
      ? textAnnotations[0] as Record<string, unknown>
      : undefined;
    const text = typeof firstAnnotation?.description === "string" ? firstAnnotation.description : "";
    return jsonResponse({ text, imageId, bookId }, req);
  } catch (error) {
    if (error instanceof ContractError) return responseForError(error, req, "vision-ocr");
    return responseForError(providerFailure(error), req, "vision-ocr");
  }
});
