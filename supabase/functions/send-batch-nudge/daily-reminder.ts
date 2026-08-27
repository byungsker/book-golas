export interface DailyReminderBook {
  id: string;
  user_id: string;
  title: string;
  current_page: number | null;
  total_pages: number | null;
  target_date?: string | null;
  updated_at: string | null;
  status: string | null;
}

export interface DailyReminderActivity {
  user_id: string;
  book_id: string;
  created_at: string | null;
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const READING_ACTIVITY_LOOKBACK_DAYS = 90;

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function selectDailyReminderBook(
  books: DailyReminderBook[],
  activities: DailyReminderActivity[] = [],
): DailyReminderBook | null {
  const readingBooks = books.filter((book) => book.status === "reading");
  if (readingBooks.length === 0) return null;

  const latestActivityByBook = new Map<string, number>();
  activities.forEach((activity) => {
    if (!activity.created_at) return;
    const activityTime = new Date(activity.created_at).getTime();
    if (!Number.isFinite(activityTime)) return;

    const currentLatest = latestActivityByBook.get(activity.book_id) ?? 0;
    if (activityTime > currentLatest) {
      latestActivityByBook.set(activity.book_id, activityTime);
    }
  });

  return readingBooks.sort((a, b) => {
    const aActivityTime = latestActivityByBook.get(a.id);
    const bActivityTime = latestActivityByBook.get(b.id);
    if (aActivityTime !== undefined && bActivityTime === undefined) return -1;
    if (aActivityTime === undefined && bActivityTime !== undefined) return 1;

    const aTime = aActivityTime ??
      (a.updated_at ? new Date(a.updated_at).getTime() : 0);
    const bTime = bActivityTime ??
      (b.updated_at ? new Date(b.updated_at).getTime() : 0);
    return bTime - aTime;
  })[0];
}

export function buildDailyReminderDedupeKey({
  kstDate,
  userId,
  tokenHash,
}: {
  kstDate: string;
  userId: string;
  tokenHash: string;
}): string {
  return `daily:${kstDate}:${userId}:${tokenHash}`;
}

export function buildGoalAlarmDedupeKey({
  kstDate,
  userId,
  bookId,
  tokenHash,
}: {
  kstDate: string;
  userId: string;
  bookId: string;
  tokenHash: string;
}): string {
  return `goal:${kstDate}:${userId}:${bookId}:${tokenHash}`;
}

export function getReadingActivityCutoff(now: Date): string {
  return new Date(
    now.getTime() - READING_ACTIVITY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export function getActivityKstDateString(createdAt: string): string | null {
  const date = new Date(createdAt);
  if (!Number.isFinite(date.getTime())) return null;
  return toDateKey(new Date(date.getTime() + KST_OFFSET_MS));
}

export function calculateReadingStreak(
  activities: DailyReminderActivity[],
  now: Date,
): number {
  const activityDates = new Set(
    activities
      .map((activity) =>
        activity.created_at
          ? getActivityKstDateString(activity.created_at)
          : null
      )
      .filter((date): date is string => date !== null),
  );
  if (activityDates.size === 0) return 0;

  const today = new Date(now.getTime() + KST_OFFSET_MS);
  today.setUTCHours(0, 0, 0, 0);
  const todayString = toDateKey(today);
  const cursor = new Date(today);

  if (!activityDates.has(todayString)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!activityDates.has(toDateKey(cursor))) return 0;
  }

  let streak = 0;
  while (activityDates.has(toDateKey(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export function buildDailyReminderVariables(
  book: DailyReminderBook,
): Record<string, string> {
  return {
    bookTitle: book.title,
    percent: String(
      calculateProgressPercent(book.current_page, book.total_pages),
    ),
  };
}

function calculateProgressPercent(
  currentPage: number | null,
  totalPages: number | null,
): number {
  if (!totalPages || totalPages <= 0) return 0;

  const safeCurrentPage = Math.max(0, currentPage ?? 0);
  const percent = Math.round((safeCurrentPage / totalPages) * 100);

  return Math.min(100, Math.max(0, percent));
}
