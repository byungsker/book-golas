import { describe, expect, it } from "vitest";
import {
  ExportReadingDataRequestSchema,
  ExportReadingDataResultSchema,
} from "./index";

const request = {
  year: 2026,
  email: "reader@example.com",
  format: "csv" as const,
  includeImages: true,
};

describe("reading data export contracts", () => {
  it("accepts a selected-year owner export request and result", () => {
    expect(ExportReadingDataRequestSchema.parse(request)).toEqual(request);
    expect(ExportReadingDataResultSchema.parse({
      exportId: "00000000-0000-4000-8000-000000000443",
      year: 2026,
      format: "csv",
      status: "ready",
      bookCount: 1,
      recordCount: 3,
      downloadUrl: null,
      expiresAt: null,
    })).toMatchObject({ year: 2026, bookCount: 1, recordCount: 3 });
  });

  it("rejects caller identity fields, malformed email and unbounded values", () => {
    expect(() => ExportReadingDataRequestSchema.parse({ ...request, user_id: "foreign-user" })).toThrow();
    expect(() => ExportReadingDataRequestSchema.parse({ ...request, email: "not-an-email" })).toThrow();
    expect(() => ExportReadingDataRequestSchema.parse({ ...request, year: 1999 })).toThrow();
    expect(() => ExportReadingDataResultSchema.parse({
      exportId: request.email,
      year: request.year,
      format: request.format,
      status: "ready",
      bookCount: -1,
      recordCount: 0,
      downloadUrl: null,
      expiresAt: null,
    })).toThrow();
  });
});
