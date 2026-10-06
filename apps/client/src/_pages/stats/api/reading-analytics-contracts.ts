import { z } from "zod";
import {
  CALENDAR_TIME_ZONE,
  CalendarDayKeySchema,
  CalendarSourceProgressSchema,
  CalendarSourceSessionSchema,
  calendarDateFromDayKey,
  calendarDayKeyFromDate,
} from "@/shared/api/contracts/calendar";
import { InsightSchema } from "@/shared/api/contracts/ai";
import { BookIdSchema, IsoDateSchema, LocaleSchema, RequestIdSchema } from "@/shared/api/contracts/common";

export const CHARTS_GOALS_TIME_ZONE = CALENDAR_TIME_ZONE;
export const MAX_READING_ANALYTICS_RANGE_DAYS = 366;
export const MAX_READING_ANALYTICS_INSIGHTS = 3;

export const ReadingAnalyticsViewSchema = z.enum(["annual", "monthly", "weekly", "custom"]);
export type ReadingAnalyticsView = z.infer<typeof ReadingAnalyticsViewSchema>;

export const ReadingAnalyticsStatusSchema = z.enum(["all", "reading", "completed"]);
export type ReadingAnalyticsStatus = z.infer<typeof ReadingAnalyticsStatusSchema>;

export const ReadingAnalyticsTabSchema = z.enum(["overview", "analysis", "activity"]);
export type ReadingAnalyticsTab = z.infer<typeof ReadingAnalyticsTabSchema>;

export const ReadingAnalyticsBookStatusSchema = z.enum([
  "planned",
  "reading",
  "completed",
  "will_retry",
  "unknown",
]);

export const ReadingAnalyticsBookSchema = z
  .object({
    bookId: BookIdSchema,
    title: z.string().trim().min(1).max(500),
    status: ReadingAnalyticsBookStatusSchema,
    genre: z.string().trim().max(200).nullable(),
    attemptCount: z.number().int().min(1).max(100),
    createdAt: IsoDateSchema.nullable(),
    updatedAt: IsoDateSchema.nullable(),
  })
  .strict();
export type ReadingAnalyticsBook = z.infer<typeof ReadingAnalyticsBookSchema>;

export const ReadingAnalyticsSourceProgressSchema = CalendarSourceProgressSchema;
export type ReadingAnalyticsSourceProgress = z.infer<typeof ReadingAnalyticsSourceProgressSchema>;

export const ReadingAnalyticsSourceSessionSchema = CalendarSourceSessionSchema;
export type ReadingAnalyticsSourceSession = z.infer<typeof ReadingAnalyticsSourceSessionSchema>;

export const ReadingAnalyticsSourceGoalSchema = z
  .object({
    year: z.number().int().min(2000).max(2100),
    targetBooks: z.number().int().min(0).max(999),
  })
  .strict();
export type ReadingAnalyticsSourceGoal = z.infer<typeof ReadingAnalyticsSourceGoalSchema>;

export const ReadingAnalyticsRequestSchema = z
  .object({
    view: ReadingAnalyticsViewSchema,
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12).optional(),
    weekStart: CalendarDayKeySchema.optional(),
    customStart: CalendarDayKeySchema.optional(),
    customEnd: CalendarDayKeySchema.optional(),
    status: ReadingAnalyticsStatusSchema,
  })
  .strict()
  .superRefine((request, context) => {
    if (request.view === "monthly" && request.month === undefined) {
      context.addIssue({ code: "custom", path: ["month"], message: "Monthly analytics require a month." });
    }
    if (request.view === "weekly") {
      if (!request.weekStart) {
        context.addIssue({ code: "custom", path: ["weekStart"], message: "Weekly analytics require a Monday." });
      } else {
        const weekStart = calendarDateFromDayKey(request.weekStart);
        if (weekStart.getUTCDay() !== 1) {
          context.addIssue({ code: "custom", path: ["weekStart"], message: "A reading week starts on Monday." });
        }
      }
    }
    if (request.view === "custom") {
      if (!request.customStart || !request.customEnd) {
        context.addIssue({ code: "custom", path: ["customStart"], message: "Custom analytics require both dates." });
      } else if (request.customStart > request.customEnd) {
        context.addIssue({ code: "custom", path: ["customEnd"], message: "The custom range must be ordered." });
      } else {
        const today = calendarDayKeyFromDate(new Date());
        if (request.customStart < "2020-01-01") {
          context.addIssue({ code: "custom", path: ["customStart"], message: "The custom range starts in 2020 or later." });
        }
        if (request.customEnd > today) {
          context.addIssue({ code: "custom", path: ["customEnd"], message: "The custom range cannot include future dates." });
        }
        const start = calendarDateFromDayKey(request.customStart).getTime();
        const end = calendarDateFromDayKey(request.customEnd).getTime();
        if (Math.floor((end - start) / 86_400_000) + 1 > MAX_READING_ANALYTICS_RANGE_DAYS) {
          context.addIssue({ code: "custom", path: ["customEnd"], message: "The custom range cannot exceed 366 days." });
        }
      }
    }
  });
export type ReadingAnalyticsRequest = z.infer<typeof ReadingAnalyticsRequestSchema>;

export const ReadingAnalyticsRangeSchema = z
  .object({
    startDay: CalendarDayKeySchema,
    endDay: CalendarDayKeySchema,
  })
  .strict()
  .superRefine((range, context) => {
    if (range.startDay > range.endDay) {
      context.addIssue({ code: "custom", path: ["endDay"], message: "The range must be ordered." });
    }
  });
export type ReadingAnalyticsRange = z.infer<typeof ReadingAnalyticsRangeSchema>;

export const ReadingAnalyticsPeriodSchema = z
  .object({
    view: ReadingAnalyticsViewSchema,
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12).nullable(),
    weekStart: CalendarDayKeySchema.nullable(),
    customStart: CalendarDayKeySchema.nullable(),
    customEnd: CalendarDayKeySchema.nullable(),
    range: ReadingAnalyticsRangeSchema,
  })
  .strict();
export type ReadingAnalyticsPeriod = z.infer<typeof ReadingAnalyticsPeriodSchema>;

export const ReadingAnalyticsPeriodPointSchema = z
  .object({
    key: z.string().trim().min(1).max(32),
    startDay: CalendarDayKeySchema,
    endDay: CalendarDayKeySchema,
    pages: z.number().int().min(0),
    pagesRead: z.number().int().min(0),
    seconds: z.number().int().min(0).max(31_536_000),
    activeDays: z.number().int().min(0),
  })
  .strict();
export type ReadingAnalyticsPeriodPoint = z.infer<typeof ReadingAnalyticsPeriodPointSchema>;

export const ReadingAnalyticsDailyPointSchema = z
  .object({
    day: CalendarDayKeySchema,
    pagesRead: z.number().int().min(0),
    seconds: z.number().int().min(0).max(86_400),
    completionCount: z.number().int().min(0),
    intensity: z.number().int().min(0).max(4),
  })
  .strict();
export type ReadingAnalyticsDailyPoint = z.infer<typeof ReadingAnalyticsDailyPointSchema>;

export const ReadingAnalyticsMonthlyBookCountSchema = z
  .object({
    month: z.number().int().min(1).max(12),
    count: z.number().int().min(0),
  })
  .strict();

export const ReadingAnalyticsGenreCountSchema = z
  .object({
    genre: z.string().trim().min(1).max(200),
    count: z.number().int().min(0),
  })
  .strict();

export const ReadingAnalyticsMetricsSchema = z
  .object({
    totalPages: z.number().int().min(0),
    totalPagesRead: z.number().int().min(0),
    averageDailyPages: z.number().min(0),
    maxDailyPages: z.number().int().min(0),
    minDailyPages: z.number().int().min(0),
    totalSeconds: z.number().int().min(0).max(31_536_000),
    activeDays: z.number().int().min(0),
    currentStreak: z.number().int().min(0),
    totalStarted: z.number().int().min(0),
    completedBooks: z.number().int().min(0),
    abandonedBooks: z.number().int().min(0),
    inProgressBooks: z.number().int().min(0),
    completionRate: z.number().min(0).max(100),
    abandonRate: z.number().min(0).max(100),
    retrySuccessRate: z.number().min(0).max(100),
  })
  .strict();
export type ReadingAnalyticsMetrics = z.infer<typeof ReadingAnalyticsMetricsSchema>;

export const ReadingAnalyticsGoalProgressSchema = z
  .object({
    year: z.number().int().min(2000).max(2100),
    targetBooks: z.number().int().min(0).max(999),
    completedBooks: z.number().int().min(0),
    remainingBooks: z.number().int().min(0),
    progressRate: z.number().min(0).max(1),
    daysLeftInYear: z.number().int().min(0).max(366),
    booksPerMonth: z.number().int().min(0),
    isOnTrack: z.boolean(),
  })
  .strict();
export type ReadingAnalyticsGoalProgress = z.infer<typeof ReadingAnalyticsGoalProgressSchema>;

export const ReadingAnalyticsFreshnessSchema = z.enum(["fresh", "stale"]);

export const ReadingAnalyticsDataSchema = z
  .object({
    version: z.literal(1),
    timeZone: z.literal(CHARTS_GOALS_TIME_ZONE),
    freshness: ReadingAnalyticsFreshnessSchema,
    status: ReadingAnalyticsStatusSchema,
    period: ReadingAnalyticsPeriodSchema,
    metrics: ReadingAnalyticsMetricsSchema,
     periods: z.array(ReadingAnalyticsPeriodPointSchema).max(MAX_READING_ANALYTICS_RANGE_DAYS),
     daily: z.array(ReadingAnalyticsDailyPointSchema).max(MAX_READING_ANALYTICS_RANGE_DAYS),
    monthlyBookCounts: z.array(ReadingAnalyticsMonthlyBookCountSchema).length(12),
     genreDistribution: z.array(ReadingAnalyticsGenreCountSchema).max(100),
     heatmap: z.array(ReadingAnalyticsDailyPointSchema).max(MAX_READING_ANALYTICS_RANGE_DAYS),
    goal: ReadingAnalyticsGoalProgressSchema,
  })
  .strict();
export type ReadingAnalyticsData = z.infer<typeof ReadingAnalyticsDataSchema>;

export const ReadingGoalUpdateRequestSchema = z
  .object({
    locale: LocaleSchema,
    year: z.number().int().min(2000).max(2100),
    targetBooks: z.number().int().min(1).max(999),
  })
  .strict();
export type ReadingGoalUpdateRequest = z.infer<typeof ReadingGoalUpdateRequestSchema>;

export const ReadingAnalyticsInsightRequestSchema = z
  .object({
    action: z.literal("generate_insight"),
    locale: LocaleSchema,
    requestKey: RequestIdSchema,
  })
  .strict();
export type ReadingAnalyticsInsightRequest = z.infer<typeof ReadingAnalyticsInsightRequestSchema>;

export const ChartsGoalsMutationRequestSchema = z.union([
  ReadingGoalUpdateRequestSchema,
  ReadingAnalyticsInsightRequestSchema,
]);

export const ReadingAnalyticsInsightsSchema = z
  .array(InsightSchema.extend({
    description: z.string().trim().min(1).max(2000),
    relatedBooks: z.array(BookIdSchema).max(20),
  }).strict())
  .max(MAX_READING_ANALYTICS_INSIGHTS);

export const ReadingAnalyticsInsightSuccessSchema = z
  .object({
    kind: z.literal("insight_generated"),
    requestKey: RequestIdSchema,
    insights: ReadingAnalyticsInsightsSchema,
  })
  .strict();
