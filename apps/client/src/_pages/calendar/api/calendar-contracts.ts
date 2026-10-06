import { z } from "zod";
import {
  BookIdSchema,
  CalendarBookSchema,
  CalendarDayKeySchema,
  CALENDAR_TIME_ZONE,
  IsoDateSchema,
  RecordIdSchema,
} from "@/shared/api/contracts";

export const CalendarFilterSchema = z.enum(["all", "reading", "completed"]);
export type CalendarFilter = z.infer<typeof CalendarFilterSchema>;

export const CalendarEventKindSchema = z.enum(["progress", "session"]);
export type CalendarEventKind = z.infer<typeof CalendarEventKindSchema>;

export const CalendarActivityEventSchema = z
  .object({
    id: RecordIdSchema,
    bookId: BookIdSchema,
    kind: CalendarEventKindSchema,
    day: CalendarDayKeySchema,
    occurredAt: IsoDateSchema,
    page: z.number().int().min(0).nullable(),
    previousPage: z.number().int().min(0).nullable(),
    pagesRead: z.number().int().min(0),
    durationSeconds: z.number().int().min(0).max(28_800),
  })
  .strict()
  .superRefine((event, context) => {
    if (event.kind === "progress" && (event.page === null || event.previousPage === null)) {
      context.addIssue({
        code: "custom",
        path: ["page"],
        message: "Progress events require page boundaries.",
      });
    }
    if (event.kind === "session" && (event.page !== null || event.previousPage !== null)) {
      context.addIssue({
        code: "custom",
        path: ["page"],
        message: "Session events cannot claim page boundaries.",
      });
    }
  });
export type CalendarActivityEvent = z.infer<typeof CalendarActivityEventSchema>;

export const CalendarBookDaySchema = z
  .object({
    ...CalendarBookSchema.shape,
    kind: z.enum(["activity", "planned"]),
    pagesRead: z.number().int().min(0),
    durationSeconds: z.number().int().min(0).max(86_400),
    eventCount: z.number().int().min(0),
    lastActivityAt: IsoDateSchema.nullable(),
    events: z.array(CalendarActivityEventSchema),
  })
  .strict()
  .superRefine((book, context) => {
    if (book.kind === "activity" && book.eventCount === 0) {
      context.addIssue({
        code: "custom",
        path: ["eventCount"],
        message: "Activity rows require at least one stable source event.",
      });
    }
    if (book.eventCount !== book.events.length) {
      context.addIssue({
        code: "custom",
        path: ["eventCount"],
        message: "eventCount must match the source event list.",
      });
    }
  });
export type CalendarBookDay = z.infer<typeof CalendarBookDaySchema>;

export const CalendarDaySchema = z
  .object({
    day: CalendarDayKeySchema,
    pagesRead: z.number().int().min(0),
    durationSeconds: z.number().int().min(0).max(86_400),
    eventCount: z.number().int().min(0),
    books: z.array(CalendarBookDaySchema).min(1),
  })
  .strict();
export type CalendarDay = z.infer<typeof CalendarDaySchema>;

export const CalendarDataSchema = z
  .object({
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12),
    timeZone: z.literal(CALENDAR_TIME_ZONE),
    filter: CalendarFilterSchema,
    monthlyBookCount: z.number().int().min(0),
    activeDayCount: z.number().int().min(0),
    days: z.array(CalendarDaySchema),
  })
  .strict();
export type CalendarData = z.infer<typeof CalendarDataSchema>;
