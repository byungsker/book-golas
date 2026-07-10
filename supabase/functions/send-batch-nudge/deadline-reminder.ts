export interface DeadlineReminderBook {
  id: string;
  user_id: string;
  title: string;
  current_page: number | null;
  total_pages: number | null;
  target_date: string | null;
  updated_at: string | null;
  status: string | null;
}

export type DeadlineReminderStage =
  | "deadline_warmup"
  | "deadline_soon"
  | "deadline_tomorrow"
  | "deadline_today"
  | "deadline_overdue";

export interface DeadlineReminderState {
  book: DeadlineReminderBook;
  stage: DeadlineReminderStage;
  daysLeft: number;
  remainingPages: number;
  targetPages: number;
  percent: number;
}

export interface SendDecision {
  shouldSend: boolean;
  slotLabel: string | null;
}

export const MAX_BOOKS_PER_SLOT = 3;
const DEADLINE_WINDOW_DAYS = 7;
const OVERDUE_WINDOW_DAYS = 7;

export function selectDeadlineReminderBooks(
  books: DeadlineReminderBook[],
  now: Date,
): DeadlineReminderBook[] {
  return books
    .filter((book) => calculateDeadlineState(book, now) !== null)
    .sort((a, b) => {
      const aDaysLeft = getKstDaysLeft(now, a.target_date!);
      const bDaysLeft = getKstDaysLeft(now, b.target_date!);
      if (aDaysLeft !== bDaysLeft) return aDaysLeft - bDaysLeft;

      return remainingPages(b) - remainingPages(a);
    });
}

export function calculateDeadlineState(
  book: DeadlineReminderBook,
  now: Date,
): DeadlineReminderState | null {
  if (book.status !== "reading") return null;
  if (!book.target_date) return null;
  if (!book.total_pages || book.total_pages <= 0) return null;

  const currentPage = Math.max(0, book.current_page ?? 0);
  if (currentPage >= book.total_pages) return null;

  const daysLeft = getKstDaysLeft(now, book.target_date);
  if (daysLeft > DEADLINE_WINDOW_DAYS) return null;
  if (daysLeft < -OVERDUE_WINDOW_DAYS) return null;

  const remaining = Math.max(0, book.total_pages - currentPage);
  const inclusiveDays = Math.max(1, daysLeft + 1);
  const targetPages = Math.ceil(remaining / inclusiveDays);
  const percent = calculateProgressPercent(currentPage, book.total_pages);

  return {
    book,
    stage: stageForDaysLeft(daysLeft),
    daysLeft,
    remainingPages: remaining,
    targetPages,
    percent,
  };
}

export function buildDeadlineReminderVariables(
  state: DeadlineReminderState,
): Record<string, string> {
  return {
    bookTitle: state.book.title,
    daysLeft: String(Math.max(0, state.daysLeft)),
    remainingPages: String(state.remainingPages),
    targetPages: String(state.targetPages),
    percent: String(state.percent),
  };
}

export function shouldSendDeadlineReminder({
  stage,
  kstHour,
  kstMinute,
  goalHour,
  goalMinute,
  dedupeKey,
  sentKeys,
}: {
  stage: DeadlineReminderStage;
  kstHour: number;
  kstMinute: number;
  goalHour: number;
  goalMinute: number;
  dedupeKey: string;
  sentKeys: Set<string>;
}): SendDecision {
  if (sentKeys.has(dedupeKey)) {
    return { shouldSend: false, slotLabel: null };
  }

  if (kstHour < 8 || kstHour > 22) {
    return { shouldSend: false, slotLabel: null };
  }

  if (kstHour === goalHour && kstMinute === goalMinute) {
    return { shouldSend: true, slotLabel: "goal" };
  }

  if (stage === "deadline_warmup" || stage === "deadline_overdue") {
    return { shouldSend: false, slotLabel: null };
  }

  if (kstMinute !== 0) {
    return { shouldSend: false, slotLabel: null };
  }

  if (kstHour === 18 && !(goalHour === 18 && goalMinute === 0)) {
    return { shouldSend: true, slotLabel: "secondary_18" };
  }

  if (kstHour === 20 && !(goalHour === 20 && goalMinute === 0)) {
    return { shouldSend: true, slotLabel: "secondary_20" };
  }

  return { shouldSend: false, slotLabel: null };
}

export function buildDeadlineDedupeKey({
  kstDate,
  userId,
  bookId,
  stage,
  slotLabel,
}: {
  kstDate: string;
  userId: string;
  bookId: string;
  stage: DeadlineReminderStage;
  slotLabel: string;
}): string {
  return `deadline:${kstDate}:${userId}:${bookId}:${stage}:${slotLabel}`;
}

export function getKstDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function stageForDaysLeft(daysLeft: number): DeadlineReminderStage {
  if (daysLeft < 0) return "deadline_overdue";
  if (daysLeft === 0) return "deadline_today";
  if (daysLeft === 1) return "deadline_tomorrow";
  if (daysLeft <= 3) return "deadline_soon";
  return "deadline_warmup";
}

export function getKstDaysLeft(now: Date, targetDate: string): number {
  const nowKst = parseKstDate(getKstDateString(now));
  const targetKst = parseKstDate(targetDate.slice(0, 10));
  return Math.round((targetKst.getTime() - nowKst.getTime()) / 86_400_000);
}

function parseKstDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function remainingPages(book: DeadlineReminderBook): number {
  return Math.max(
    0,
    (book.total_pages ?? 0) - Math.max(0, book.current_page ?? 0),
  );
}

function calculateProgressPercent(
  currentPage: number,
  totalPages: number,
): number {
  if (totalPages <= 0) return 0;
  const percent = Math.round((Math.max(0, currentPage) / totalPages) * 100);
  return Math.min(100, Math.max(0, percent));
}
