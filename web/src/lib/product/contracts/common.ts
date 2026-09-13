import { z } from "zod";

export const localeValues = ["ko", "en"] as const;
export const LocaleSchema = z.enum(localeValues);
export type Locale = z.infer<typeof LocaleSchema>;

export const UserIdSchema = z.string().uuid().brand<"UserId">();
export const BookIdSchema = z.string().uuid().brand<"BookId">();
export const ImageIdSchema = z.string().uuid().brand<"ImageId">();
export const RecordIdSchema = z.string().uuid().brand<"RecordId">();
export const RequestIdSchema = z.string().uuid().brand<"RequestId">();
export const IsoDateSchema = z.string().datetime({ offset: true });
export type UserId = z.infer<typeof UserIdSchema>;
export type BookId = z.infer<typeof BookIdSchema>;

export const PaginationSchema = z
  .object({
    cursor: z.string().trim().min(1).max(256).optional(),
    limit: z.number().int().min(1).max(100).default(25),
  })
  .strict();

export const PageInfoSchema = z
  .object({
    nextCursor: z.string().trim().min(1).max(256).nullable(),
    hasMore: z.boolean(),
  })
  .strict();

export const sortFieldValues = ["created_at", "updated_at", "title", "current_page"] as const;
export const sortDirectionValues = ["asc", "desc"] as const;
export const SortSchema = z
  .object({
    field: z.enum(sortFieldValues),
    direction: z.enum(sortDirectionValues),
  })
  .strict();

export const errorCodeValues = [
  "validation_error",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "payload_too_large",
  "rate_limited",
  "provider_error",
  "consent_required",
  "quota_exceeded",
  "offline",
  "cancelled",
  "unavailable",
] as const;
export const ErrorCodeSchema = z.enum(errorCodeValues);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const httpStatusValues = [400, 401, 403, 404, 409, 413, 429, 500, 502, 503, 504] as const;
export const HttpStatusSchema = z.union(httpStatusValues.map((status) => z.literal(status)));

const errorStatusByCode = {
  validation_error: [400],
  unauthorized: [401],
  forbidden: [403],
  not_found: [404],
  conflict: [409],
  payload_too_large: [413],
  rate_limited: [429],
  provider_error: [500, 502, 503, 504],
  consent_required: [403],
  quota_exceeded: [429],
  offline: [503],
  cancelled: [409],
  unavailable: [500, 502, 503, 504],
} as const;

export const ApiErrorSchema = z
  .object({
    code: ErrorCodeSchema,
    status: HttpStatusSchema,
    message: z.string().trim().min(1).max(500),
    retryable: z.boolean(),
    requestId: RequestIdSchema.optional(),
  })
  .strict()
  .superRefine((error, context) => {
    const validStatuses: readonly number[] = errorStatusByCode[error.code];
    if (!validStatuses.includes(error.status)) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: `status ${error.status} does not match ${error.code}`,
      });
    }
  });
export const ApiErrorResponseSchema = z.object({ error: ApiErrorSchema }).strict();

export const CancellationRequestSchema = z
  .object({
    requestId: RequestIdSchema,
    reason: z.string().trim().min(1).max(120),
  })
  .strict();

export type ProductSchema<T> = z.ZodType<T>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type PageInfo = z.infer<typeof PageInfoSchema>;
export type Sort = z.infer<typeof SortSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
export type CancellationRequest = z.infer<typeof CancellationRequestSchema>;
