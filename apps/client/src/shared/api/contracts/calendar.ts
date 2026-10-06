import { z } from "zod";
import { BookIdSchema, IsoDateSchema, RecordIdSchema } from "./common";

export const CALENDAR_TIME_ZONE = "Asia/Seoul" as const;

export const CalendarBookStatusSchema = z.enum([
  "planned",
  "reading",
  "completed",
  "will_retry",
  "unknown",
]);
export type CalendarBookStatus = z.infer<typeof CalendarBookStatusSchema>;

export const CalendarDayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export type CalendarDayKey = z.infer<typeof CalendarDayKeySchema>;

export const CalendarBookSchema = z
  .object({
    bookId: BookIdSchema,
    title: z.string().trim().min(1).max(500),
    author: z.string().trim().min(1).max(500).nullable(),
    imageUrl: z.string().trim().min(1).nullable(),
    status: CalendarBookStatusSchema,
    startDate: IsoDateSchema,
    targetDate: IsoDateSchema,
    plannedStartDate: IsoDateSchema.nullable(),
    pausedAt: IsoDateSchema.nullable(),
  })
  .strict();

export const CalendarSourceBookSchema = CalendarBookSchema;
export const CalendarSourceProgressSchema = z
  .object({
    id: RecordIdSchema,
    bookId: BookIdSchema,
    page: z.number().int().min(0),
    previousPage: z.number().int().min(0),
    readingTime: z.number().int().min(0).max(28_800).nullable(),
    occurredAt: IsoDateSchema,
  })
  .strict()
  .superRefine((event, context) => {
    if (event.page < event.previousPage) {
      context.addIssue({
        code: "custom",
        path: ["page"],
        message: "Progress cannot move backwards.",
      });
    }
  });
export type CalendarSourceProgress = z.infer<typeof CalendarSourceProgressSchema>;

export const CalendarSourceSessionSchema = z
  .object({
    id: RecordIdSchema,
    bookId: BookIdSchema,
    startedAt: IsoDateSchema,
    endedAt: IsoDateSchema.nullable(),
    durationSeconds: z.number().int().min(0).max(28_800),
    createdAt: IsoDateSchema.nullable(),
  })
  .strict()
  .superRefine((session, context) => {
    if (session.endedAt && Date.parse(session.endedAt) < Date.parse(session.startedAt)) {
      context.addIssue({
        code: "custom",
        path: ["endedAt"],
        message: "A reading session cannot end before it starts.",
      });
    }
  });
export type CalendarSourceSession = z.infer<typeof CalendarSourceSessionSchema>;

function datePart(value: Date, type: "year" | "month" | "day"): string {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone: CALENDAR_TIME_ZONE,
    [type]: type === "year" ? "numeric" : "2-digit",
  }).formatToParts(value).find((item) => item.type === type)?.value;
  return part ?? "";
}

export function calendarDayKeyFromDate(value: Date): CalendarDayKey {
  const year = datePart(value, "year").padStart(4, "0");
  const month = datePart(value, "month").padStart(2, "0");
  const day = datePart(value, "day").padStart(2, "0");
  return CalendarDayKeySchema.parse(`${year}-${month}-${day}`);
}

export function calendarDayKeyFromIso(value: string): CalendarDayKey {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new RangeError("Calendar event timestamp is invalid.");
  return calendarDayKeyFromDate(parsed);
}

export function calendarDateFromDayKey(day: CalendarDayKey): Date {
  const parsed = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(day);
  if (!parsed) throw new RangeError("Calendar day key is invalid.");
  return new Date(Date.UTC(Number(parsed[1]), Number(parsed[2]) - 1, Number(parsed[3]), 12));
}

export function currentCalendarMonth(): { readonly year: number; readonly month: number } {
  const today = calendarDayKeyFromDate(new Date());
  return { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
}
