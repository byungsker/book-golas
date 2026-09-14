import { z } from "zod";
import {
  BookIdSchema,
  IsoDateSchema,
  LocaleSchema,
  PaginationSchema,
  RecordIdSchema,
  SortSchema,
} from "./common";
import { BookStatusSchema } from "./books";

export const exportFormatValues = ["json", "csv"] as const;
export const exportStatusValues = ["queued", "ready", "failed"] as const;
export const ExportReadingDataResultSchema = z
  .object({
    exportId: RecordIdSchema,
    format: z.enum(exportFormatValues),
    status: z.enum(exportStatusValues),
    downloadUrl: z.string().trim().min(1).nullable(),
    expiresAt: IsoDateSchema.nullable(),
  })
  .strict();

export const deleteAccountStatusValues = ["accepted", "completed", "already_deleted"] as const;
export const DeleteAccountResultSchema = z
  .object({
    status: z.enum(deleteAccountStatusValues),
    acceptedAt: IsoDateSchema,
  })
  .strict();

const LocalizedPathSchema = z
  .string()
  .trim()
  .superRefine((next, context) => {
    const [rawPath] = next.split(/[?#]/, 1);
    const segments = rawPath.split("/");
    if (!rawPath.startsWith("/") || rawPath.startsWith("//") || rawPath.includes("\\") || segments.length < 2) {
      context.addIssue({ code: "custom", message: "next must be a local localized path" });
      return;
    }
    if (!LocaleSchema.safeParse(segments[1]).success) {
      context.addIssue({ code: "custom", message: "next must start with a supported locale" });
      return;
    }
    for (const segment of segments.slice(2)) {
      let decodedSegment: string;
      try {
        decodedSegment = decodeURIComponent(segment);
      } catch {
        context.addIssue({ code: "custom", message: "next contains an invalid encoded path segment" });
        return;
      }
      if (decodedSegment === "." || decodedSegment === ".." || decodedSegment.includes("/") || decodedSegment.includes("\\")) {
        context.addIssue({ code: "custom", message: "next cannot contain traversal segments" });
        return;
      }
    }
  });

export const AuthRequestSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1).max(256),
    locale: LocaleSchema,
    next: LocalizedPathSchema.optional(),
  })
  .strict()
  .superRefine((request, context) => {
    if (request.next) {
      const nextLocale = request.next.split(/[?#]/, 1)[0].split("/")[1];
      if (nextLocale !== request.locale) {
        context.addIssue({ code: "custom", path: ["next"], message: "next locale must match request locale" });
      }
    }
  });

export const BookListRequestSchema = z
  .object({
    pagination: PaginationSchema,
    sort: SortSchema,
    status: BookStatusSchema.optional(),
  })
  .strict();

export const BookSearchRequestSchema = z
  .object({
    query: z.string().trim().min(1).max(200),
    locale: LocaleSchema,
    pagination: PaginationSchema,
  })
  .strict();

export const CreateBookRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(500),
    author: z.string().trim().min(1).max(500).nullable(),
    startDate: IsoDateSchema,
    targetDate: IsoDateSchema,
    totalPages: z.number().int().min(0),
    status: BookStatusSchema,
    imageUrl: z.string().trim().min(1).nullable(),
    genre: z.string().trim().min(1).max(120).nullable(),
    publisher: z.string().trim().min(1).max(200).nullable(),
    isbn: z.string().trim().min(1).max(32).nullable(),
    aladinUrl: z.string().trim().min(1).nullable(),
    price: z.number().int().min(0).nullable(),
    dailyTargetPages: z.number().int().min(1).nullable(),
    priority: z.number().int().min(0).max(5).nullable(),
  })
  .strict();

export const UpdateBookRequestSchema = z
  .object({
    bookId: BookIdSchema,
    title: z.string().trim().min(1).max(500).optional(),
    author: z.string().trim().min(1).max(500).nullable().optional(),
    targetDate: IsoDateSchema.optional(),
    status: BookStatusSchema.optional(),
    dailyTargetPages: z.number().int().min(1).nullable().optional(),
    priority: z.number().int().min(0).max(5).nullable().optional(),
    review: z.string().nullable().optional(),
  })
  .strict()
  .refine((request) => Object.keys(request).length > 1, "at least one book field is required");

export const ProgressUpdateRequestSchema = z
  .object({
    bookId: BookIdSchema,
    currentPage: z.number().int().min(0),
    expectedCurrentPage: z.number().int().min(0),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

export const ReadingSessionCommandSchema = z
  .object({
    action: z.enum(["start", "finish"]),
    bookId: BookIdSchema,
    startedAt: IsoDateSchema,
    endedAt: IsoDateSchema.nullable(),
    durationSeconds: z.number().int().min(0).max(28_800),
  })
  .strict();

export const GoalUpsertRequestSchema = z
  .object({ year: z.number().int().min(2000).max(2100), targetBooks: z.number().int().min(0).max(1000) })
  .strict();

export const RecallSearchRequestSchema = z
  .object({
    query: z.string().trim().min(1).max(500),
    locale: LocaleSchema,
    bookId: BookIdSchema.optional(),
    pagination: PaginationSchema,
  })
  .strict();

export const InsightRequestSchema = z
  .object({
    locale: LocaleSchema,
    range: z.enum(["annual", "monthly", "weekly", "custom"]),
    from: IsoDateSchema.optional(),
    to: IsoDateSchema.optional(),
  })
  .strict()
  .superRefine((request, context) => {
    if (request.range === "custom" && (!request.from || !request.to)) {
      context.addIssue({
        code: "custom",
        path: ["from"],
        message: "custom insight ranges require from and to",
      });
    }
    if (request.from && request.to && Date.parse(request.from) > Date.parse(request.to)) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "custom insight range must end on or after it starts",
      });
    }
  });

export const RecommendationRequestSchema = z.object({ locale: LocaleSchema }).strict();

export const ConsentUpdateRequestSchema = z
  .object({
    kind: z.enum(["ai", "notifications", "camera", "share", "ocr"]),
    status: z.enum(["granted", "denied"]),
    version: z.string().trim().min(1).max(80),
  })
  .strict();

export const NotificationSettingsUpdateRequestSchema = z
  .object({
    notificationEnabled: z.boolean().optional(),
    dailyReminderEnabled: z.boolean().optional(),
    dailyReminderHour: z.number().int().min(0).max(23).optional(),
    dailyReminderMinute: z.union([z.literal(0), z.literal(30)]).optional(),
    goalAlarmEnabled: z.boolean().optional(),
    goalAlarmHour: z.number().int().min(0).max(23).optional(),
    goalAlarmMinute: z.union([z.literal(0), z.literal(30)]).optional(),
    eventNudgeEnabled: z.boolean().optional(),
    announcementsEnabled: z.boolean().optional(),
  })
  .strict()
  .refine((request) => Object.keys(request).length > 0, "at least one notification setting is required");

export const ExportReadingDataRequestSchema = z
  .object({ format: z.enum(exportFormatValues), includeImages: z.boolean() })
  .strict();

export const DeleteAccountRequestSchema = z.object({ confirmation: z.literal(true) }).strict();

export const ConsumerRequestSchemas = {
  auth: AuthRequestSchema,
  bookList: BookListRequestSchema,
  bookSearch: BookSearchRequestSchema,
  createBook: CreateBookRequestSchema,
  updateBook: UpdateBookRequestSchema,
  progress: ProgressUpdateRequestSchema,
  readingSession: ReadingSessionCommandSchema,
  goal: GoalUpsertRequestSchema,
  recallSearch: RecallSearchRequestSchema,
  insight: InsightRequestSchema,
  recommendation: RecommendationRequestSchema,
  consent: ConsentUpdateRequestSchema,
  notificationSettings: NotificationSettingsUpdateRequestSchema,
  exportReadingData: ExportReadingDataRequestSchema,
  deleteAccount: DeleteAccountRequestSchema,
} as const;

export type BookListRequest = z.infer<typeof BookListRequestSchema>;
export type BookSearchRequest = z.infer<typeof BookSearchRequestSchema>;
export type CreateBookRequest = z.infer<typeof CreateBookRequestSchema>;
export type UpdateBookRequest = z.infer<typeof UpdateBookRequestSchema>;
export type ProgressUpdateRequest = z.infer<typeof ProgressUpdateRequestSchema>;
export type ReadingSessionCommand = z.infer<typeof ReadingSessionCommandSchema>;
export type GoalUpsertRequest = z.infer<typeof GoalUpsertRequestSchema>;
export type ConsumerRequest = {
  [Key in keyof typeof ConsumerRequestSchemas]: z.infer<(typeof ConsumerRequestSchemas)[Key]>;
}[keyof typeof ConsumerRequestSchemas];
export type ExportReadingDataResult = z.infer<typeof ExportReadingDataResultSchema>;
export type DeleteAccountResult = z.infer<typeof DeleteAccountResultSchema>;
