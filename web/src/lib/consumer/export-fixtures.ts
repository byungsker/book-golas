import {
  consentRequiredError,
  failure,
  forbiddenError,
  offlineError,
  providerError,
  quotaExceededError,
  success,
  unauthorizedError,
  unavailableError,
  validationError,
  type ProductError,
  type ProductResult,
} from "@/lib/product/dal/errors";
import {
  ExportReadingDataResultSchema,
  type ExportReadingDataResult,
} from "@/lib/product/contracts";

const exportFixtureResult = {
  exportId: "00000000-0000-4000-8000-000000000443",
  year: 2026,
  format: "csv" as const,
  status: "ready" as const,
  bookCount: 1,
  recordCount: 3,
  downloadUrl: null,
  expiresAt: null,
};

function errorFor(fixture: string): ProductError | null {
  if (fixture === "export-unauthorized") return unauthorizedError();
  if (fixture === "export-consent") return consentRequiredError("Export consent is required.");
  if (fixture === "export-quota") return quotaExceededError("The export limit has been reached.");
  if (fixture === "export-offline") return offlineError("Export is offline.");
  if (fixture === "export-delivery" || fixture === "export-download") return providerError("The export delivery could not be completed.");
  if (fixture === "export-mismatch") return forbiddenError("The export email must match the authenticated account.");
  if (fixture === "export-invalid-email" || fixture === "export-invalid-year" || fixture === "export-user-mismatch") return validationError("The export request is invalid.");
  if (fixture === "export-error") return unavailableError("The export service is temporarily unavailable.");
  return null;
}

export function getExportFixture(fixture: string, year: number, format: "json" | "csv"): ProductResult<ExportReadingDataResult> {
  const error = errorFor(fixture);
  if (error) return failure(error);

  const result = ExportReadingDataResultSchema.parse({
    ...exportFixtureResult,
    year,
    format,
    bookCount: fixture === "export-empty" ? 0 : exportFixtureResult.bookCount,
    recordCount: fixture === "export-empty" ? 0 : exportFixtureResult.recordCount,
  });
  return success(result);
}
