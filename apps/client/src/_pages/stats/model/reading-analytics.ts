import { z } from "zod";
import {
  CalendarDayKeySchema,
  calendarDateFromDayKey,
  calendarDayKeyFromDate,
} from "@/shared/api/contracts";
import {
  CHARTS_GOALS_TIME_ZONE,
  MAX_READING_ANALYTICS_RANGE_DAYS,
  ReadingAnalyticsBookSchema,
  ReadingAnalyticsDailyPointSchema,
  ReadingAnalyticsDataSchema,
  ReadingAnalyticsFreshnessSchema,
  ReadingAnalyticsGoalProgressSchema,
  ReadingAnalyticsPeriodPointSchema,
  ReadingAnalyticsRangeSchema,
  ReadingAnalyticsRequestSchema,
  ReadingAnalyticsSourceGoalSchema,
  ReadingAnalyticsSourceProgressSchema,
  ReadingAnalyticsSourceSessionSchema,
  ReadingAnalyticsStatusSchema,
  type ReadingAnalyticsBook,
  type ReadingAnalyticsData,
  type ReadingAnalyticsGoalProgress,
  type ReadingAnalyticsRange,
  type ReadingAnalyticsRequest,
  type ReadingAnalyticsSourceGoal,
  type ReadingAnalyticsSourceProgress,
  type ReadingAnalyticsSourceSession,
  type ReadingAnalyticsStatus,
} from "../api/reading-analytics-contracts";

function dayAtKstMidnight(day: string): Date {
  return new Date(`${day}T00:00:00+09:00`);
}

function nextDay(day: string): string {
  const date = calendarDateFromDayKey(CalendarDayKeySchema.parse(day));
  date.setUTCDate(date.getUTCDate() + 1);
  return calendarDayKeyFromDate(date);
}

function daysBetween(startDay: string, endDay: string): string[] {
  const result: string[] = [];
  let day = CalendarDayKeySchema.parse(startDay);
  const end = CalendarDayKeySchema.parse(endDay);
  while (day <= end) {
    result.push(day);
    day = nextDay(day);
  }
  return result;
}

function lastDayOfMonth(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month, 0, 12));
  return date.toISOString().slice(0, 10);
}

export function getReadingAnalyticsRange(input: ReadingAnalyticsRequest): ReadingAnalyticsRange {
  if (input.view === "annual") {
    return ReadingAnalyticsRangeSchema.parse({ startDay: `${input.year}-01-01`, endDay: `${input.year}-12-31` });
  }
  if (input.view === "monthly") {
    if (input.month === undefined) throw new RangeError("Monthly analytics require a month.");
    return ReadingAnalyticsRangeSchema.parse({
      startDay: `${input.year}-${String(input.month).padStart(2, "0")}-01`,
      endDay: lastDayOfMonth(input.year, input.month),
    });
  }
  if (input.view === "weekly") {
    if (!input.weekStart) throw new RangeError("Weekly analytics require a week start.");
    return ReadingAnalyticsRangeSchema.parse({ startDay: input.weekStart, endDay: addDays(input.weekStart, 6) });
  }
  if (!input.customStart || !input.customEnd) throw new RangeError("Custom analytics require both dates.");
  return ReadingAnalyticsRangeSchema.parse({ startDay: input.customStart, endDay: input.customEnd });
}

function addDays(day: string, count: number): string {
  const date = calendarDateFromDayKey(CalendarDayKeySchema.parse(day));
  date.setUTCDate(date.getUTCDate() + count);
  return calendarDayKeyFromDate(date);
}

export function getReadingAnalyticsSourceBounds(input: ReadingAnalyticsRequest): { start: Date; end: Date } {
  const range = getReadingAnalyticsRange(input);
  return { start: dayAtKstMidnight(range.startDay), end: dayAtKstMidnight(addDays(range.endDay, 1)) };
}

export function currentReadingAnalyticsWeekStart(): string {
  const today = calendarDateFromDayKey(calendarDayKeyFromDate(new Date()));
  const mondayOffset = (today.getUTCDay() + 6) % 7;
  today.setUTCDate(today.getUTCDate() - mondayOffset);
  return calendarDayKeyFromDate(today);
}

function pageIntensity(pages: number): number {
  if (pages <= 0) return 0;
  if (pages < 10) return 1;
  if (pages < 30) return 2;
  if (pages < 50) return 3;
  return 4;
}

function includeBook(book: ReadingAnalyticsBook, status: ReadingAnalyticsStatus): boolean {
  if (status === "completed") return book.status === "completed";
  if (status === "reading") return book.status === "reading" || book.status === "will_retry";
  return true;
}

function dayFromIso(value: string): string {
  return calendarDayKeyFromDate(new Date(value));
}

function monthFromIso(value: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: CHARTS_GOALS_TIME_ZONE, month: "numeric" }).formatToParts(new Date(value));
  return Number(parts.find((part) => part.type === "month")?.value ?? 0);
}

function yearFromIso(value: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: CHARTS_GOALS_TIME_ZONE, year: "numeric" }).formatToParts(new Date(value));
  return Number(parts.find((part) => part.type === "year")?.value ?? 0);
}

function dayNumber(day: string): number {
  return calendarDateFromDayKey(CalendarDayKeySchema.parse(day)).getTime();
}

function periodKey(day: string, input: ReadingAnalyticsRequest): string {
  if (input.view === "annual") return day.slice(0, 7);
  return day;
}

function startAndEndForPeriod(key: string, input: ReadingAnalyticsRequest): { startDay: string; endDay: string } {
  if (input.view === "annual") {
    const [year, month] = key.split("-").map(Number);
    return { startDay: `${key}-01`, endDay: lastDayOfMonth(year, month) };
  }
  return { startDay: key, endDay: key };
}

function orderedGenreCounts(books: readonly ReadingAnalyticsBook[], year: number): Array<{ genre: string; count: number }> {
  const counts = new Map<string, number>();
  for (const book of books) {
    if (book.status !== "completed" || !book.updatedAt || yearFromIso(book.updatedAt) !== year) continue;
    const rawGenre = book.genre?.trim();
    const genre = rawGenre ? rawGenre.split(">")[0].trim() || "Uncategorized" : "Uncategorized";
    counts.set(genre, (counts.get(genre) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((left, right) => right.count - left.count || left.genre.localeCompare(right.genre))
    .slice(0, 100);
}

function completedBookCounts(books: readonly ReadingAnalyticsBook[], year: number): { monthly: number[]; daily: Map<string, number>; completed: number } {
  const monthly = Array.from({ length: 12 }, () => 0);
  const daily = new Map<string, number>();
  let completed = 0;
  for (const book of books) {
    if (book.status !== "completed" || !book.updatedAt || yearFromIso(book.updatedAt) !== year) continue;
    completed += 1;
    const month = monthFromIso(book.updatedAt);
    if (month >= 1 && month <= 12) monthly[month - 1] += 1;
    const day = dayFromIso(book.updatedAt);
    daily.set(day, (daily.get(day) ?? 0) + 1);
  }
  return { monthly, daily, completed };
}

function currentStreak(progressDays: ReadonlySet<string>): number {
  if (progressDays.size === 0) return 0;
  let day = calendarDayKeyFromDate(new Date());
  if (!progressDays.has(day)) day = addDays(day, -1);
  let streak = 0;
  while (progressDays.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

function goalProgress(year: number, targetBooks: number, completedBooks: number): ReadingAnalyticsGoalProgress {
  const todayDay = calendarDayKeyFromDate(new Date());
  const todayYear = Number(todayDay.slice(0, 4));
  const endOfYear = `${year}-12-31`;
  const daysLeftInYear = year === todayYear
    ? Math.max(0, Math.floor((dayNumber(endOfYear) - dayNumber(todayDay)) / 86_400_000) + 1)
    : year > todayYear ? 365 : 0;
  const remainingBooks = Math.max(0, targetBooks - completedBooks);
  const progressRate = targetBooks > 0 ? Math.min(1, completedBooks / targetBooks) : 0;
  const booksPerMonth = daysLeftInYear > 0 && remainingBooks > 0
    ? Math.ceil(remainingBooks / (daysLeftInYear / 30))
    : 0;
  const expectedBooks = year === todayYear ? Math.floor(targetBooks * (365 - daysLeftInYear + 1) / 365) : year < todayYear ? targetBooks : 0;
  return ReadingAnalyticsGoalProgressSchema.parse({
    year,
    targetBooks,
    completedBooks,
    remainingBooks,
    progressRate,
    daysLeftInYear,
    booksPerMonth,
    isOnTrack: targetBooks === 0 || completedBooks >= expectedBooks,
  });
}

export function buildReadingAnalytics(input: {
  request: ReadingAnalyticsRequest;
  books: readonly ReadingAnalyticsBook[];
  progress: readonly ReadingAnalyticsSourceProgress[];
  sessions: readonly ReadingAnalyticsSourceSession[];
  goal?: ReadingAnalyticsSourceGoal | null;
  freshness?: z.infer<typeof ReadingAnalyticsFreshnessSchema>;
}): ReadingAnalyticsData {
  const request = ReadingAnalyticsRequestSchema.parse(input.request);
  const range = getReadingAnalyticsRange(request);
  const books = input.books.map((book) => ReadingAnalyticsBookSchema.parse(book));
  const visibleBooks = books.filter((book) => includeBook(book, request.status));
  const visibleBookIds = new Set(visibleBooks.map((book) => book.bookId));
  const progress = input.progress.map((event) => ReadingAnalyticsSourceProgressSchema.parse(event)).filter((event) => visibleBookIds.has(event.bookId));
  const sessions = input.sessions.map((event) => ReadingAnalyticsSourceSessionSchema.parse(event)).filter((event) => visibleBookIds.has(event.bookId));
  const days = daysBetween(range.startDay, range.endDay);
  const progressDays = new Set(progress.map((event) => dayFromIso(event.occurredAt)));
  const dailyByDay = new Map<string, { pagesRead: number; seconds: number }>();
  const chartByBucket = new Map<string, Map<string, number>>();
  const secondsByBucket = new Map<string, number>();

  for (const event of progress) {
    const day = dayFromIso(event.occurredAt);
    if (day < range.startDay || day > range.endDay) continue;
    const delta = Math.max(0, event.page - event.previousPage);
    const daily = dailyByDay.get(day) ?? { pagesRead: 0, seconds: 0 };
    daily.pagesRead += delta;
    dailyByDay.set(day, daily);

    const bucket = periodKey(day, request);
    const pagesByBook = chartByBucket.get(bucket) ?? new Map<string, number>();
    pagesByBook.set(event.bookId, Math.max(pagesByBook.get(event.bookId) ?? 0, event.page));
    chartByBucket.set(bucket, pagesByBook);
  }

  for (const event of sessions) {
    const day = dayFromIso(event.startedAt);
    if (day < range.startDay || day > range.endDay) continue;
    const daily = dailyByDay.get(day) ?? { pagesRead: 0, seconds: 0 };
    daily.seconds += event.durationSeconds;
    dailyByDay.set(day, daily);
    const bucket = periodKey(day, request);
    secondsByBucket.set(bucket, (secondsByBucket.get(bucket) ?? 0) + event.durationSeconds);
  }

  const periodKeys = request.view === "annual"
    ? Array.from({ length: 12 }, (_, index) => `${request.year}-${String(index + 1).padStart(2, "0")}`)
    : days;
  const periods = periodKeys.map((key) => {
    const bounds = startAndEndForPeriod(key, request);
    const pagesByBook = chartByBucket.get(key) ?? new Map<string, number>();
    const pages = [...pagesByBook.values()].reduce((sum, value) => sum + value, 0);
    const pagesRead = days
      .filter((day) => day >= bounds.startDay && day <= bounds.endDay)
      .reduce((sum, day) => sum + (dailyByDay.get(day)?.pagesRead ?? 0), 0);
    const activeDays = days.filter((day) => day >= bounds.startDay && day <= bounds.endDay && (dailyByDay.get(day)?.pagesRead ?? 0) > 0).length;
    const seconds = secondsByBucket.get(key) ?? days
      .filter((day) => day >= bounds.startDay && day <= bounds.endDay)
      .reduce((sum, day) => sum + (dailyByDay.get(day)?.seconds ?? 0), 0);
    return ReadingAnalyticsPeriodPointSchema.parse({ key, ...bounds, pages, pagesRead, seconds, activeDays });
  });

  const completion = completedBookCounts(visibleBooks, request.year);
  const daily = days.map((day) => {
    const activity = dailyByDay.get(day) ?? { pagesRead: 0, seconds: 0 };
    const completionCount = completion.daily.get(day) ?? 0;
    return ReadingAnalyticsDailyPointSchema.parse({
      day,
      pagesRead: activity.pagesRead,
      seconds: activity.seconds,
      completionCount,
      intensity: pageIntensity(activity.pagesRead),
    });
  });
  const heatmap = daysBetween(`${request.year}-01-01`, `${request.year}-12-31`).map((day) => {
    const activity = dailyByDay.get(day) ?? { pagesRead: 0, seconds: 0 };
    const completionCount = completion.daily.get(day) ?? 0;
    return ReadingAnalyticsDailyPointSchema.parse({ day, pagesRead: activity.pagesRead, seconds: activity.seconds, completionCount, intensity: pageIntensity(activity.pagesRead) });
  });

  const dailyWithPages = daily.filter((point) => point.pagesRead > 0);
  const totalStarted = visibleBooks.filter((book) => book.status !== "planned").length;
  const completedBooks = visibleBooks.filter((book) => book.status === "completed").length;
  const abandonedBooks = visibleBooks.filter((book) => book.status === "will_retry").length;
  const inProgressBooks = visibleBooks.filter((book) => book.status === "reading").length;
  const totalPagesRead = daily.reduce((sum, point) => sum + point.pagesRead, 0);
  const totalPages = periods.reduce((sum, point) => sum + point.pages, 0);
  const totalSeconds = daily.reduce((sum, point) => sum + point.seconds, 0);
  const completionRate = totalStarted > 0 ? (completedBooks / totalStarted) * 100 : 0;
  const abandonRate = totalStarted > 0 ? (abandonedBooks / totalStarted) * 100 : 0;
  const retriedBooks = visibleBooks.filter((book) => book.status === "completed" && book.attemptCount > 1).length;
  const retrySuccessRate = abandonedBooks > 0 ? Math.min(100, (retriedBooks / abandonedBooks) * 100) : 0;
  const currentGoal = input.goal && input.goal.year === request.year ? input.goal.targetBooks : 0;
  const goal = goalProgress(request.year, currentGoal, completion.completed);

  return ReadingAnalyticsDataSchema.parse({
    version: 1,
    timeZone: CHARTS_GOALS_TIME_ZONE,
    freshness: input.freshness ?? "fresh",
    status: request.status,
    period: {
      view: request.view,
      year: request.year,
      month: request.month ?? null,
      weekStart: request.weekStart ?? null,
      customStart: request.customStart ?? null,
      customEnd: request.customEnd ?? null,
      range,
    },
    metrics: {
      totalPages,
      totalPagesRead,
      averageDailyPages: dailyWithPages.length > 0 ? totalPagesRead / dailyWithPages.length : 0,
      maxDailyPages: dailyWithPages.length > 0 ? Math.max(...dailyWithPages.map((point) => point.pagesRead)) : 0,
      minDailyPages: dailyWithPages.length > 0 ? Math.min(...dailyWithPages.map((point) => point.pagesRead)) : 0,
      totalSeconds,
      activeDays: dailyWithPages.length,
      currentStreak: currentStreak(progressDays),
      totalStarted,
      completedBooks,
      abandonedBooks,
      inProgressBooks,
      completionRate,
      abandonRate,
      retrySuccessRate,
    },
    periods,
    daily,
    monthlyBookCounts: completion.monthly.map((count, index) => ({ month: index + 1, count })),
    genreDistribution: orderedGenreCounts(visibleBooks, request.year),
    heatmap,
    goal,
  });
}
