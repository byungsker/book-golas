import type { ConsumerBook, ConsumerBookStatus } from "./types";

export const homeBookListViews = [
  "reading",
  "planned",
  "completed",
  "paused",
  "all",
] as const;

export type HomeBookListView = (typeof homeBookListViews)[number];
export type HomeBookListStatus = Exclude<ConsumerBookStatus, "unknown">;

const statusOrder: Record<HomeBookListStatus, number> = {
  reading: 0,
  planned: 1,
  completed: 2,
  will_retry: 3,
};

export function getHomeBookListView(value: string | null | undefined): HomeBookListView {
  return homeBookListViews.includes(value as HomeBookListView)
    ? (value as HomeBookListView)
    : "reading";
}

export function getEffectiveBookStatus(book: ConsumerBook): ConsumerBookStatus {
  if (book.status === "completed") return "completed";
  if (book.totalPages > 0 && book.currentPage >= book.totalPages) return "completed";
  return book.status;
}

export function getHomeBookListStatus(view: HomeBookListView): HomeBookListStatus | null {
  return view === "paused" ? "will_retry" : view === "all" ? null : view;
}

function dateValue(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function compareDescending(a: string | null, b: string | null): number {
  return dateValue(b) - dateValue(a);
}

function compareByStableId(a: ConsumerBook, b: ConsumerBook): number {
  return a.id.localeCompare(b.id);
}

function compareBooks(a: ConsumerBook, b: ConsumerBook): number {
  const aStatus = getEffectiveBookStatus(a);
  const bStatus = getEffectiveBookStatus(b);
  const aOrder = aStatus in statusOrder ? statusOrder[aStatus as HomeBookListStatus] : 99;
  const bOrder = bStatus in statusOrder ? statusOrder[bStatus as HomeBookListStatus] : 99;

  if (aOrder !== bOrder) return aOrder - bOrder;

  if (aStatus === "planned" && bStatus === "planned") {
    const plannedDateDifference = dateValue(a.plannedStartDate ?? a.targetDate) - dateValue(b.plannedStartDate ?? b.targetDate);
    if (plannedDateDifference !== 0) return plannedDateDifference;
  }

  if (aStatus === "will_retry" && bStatus === "will_retry") {
    const pausedDateDifference = compareDescending(a.pausedAt, b.pausedAt);
    if (pausedDateDifference !== 0) return pausedDateDifference;
  }

  const updatedDifference = compareDescending(a.updatedAt, b.updatedAt);
  return updatedDifference !== 0 ? updatedDifference : compareByStableId(a, b);
}

export function selectHomeBookListBooks(
  books: readonly ConsumerBook[],
  view: HomeBookListView,
): ConsumerBook[] {
  const selectedStatus = getHomeBookListStatus(view);
  return books
    .filter((book) => selectedStatus === null || getEffectiveBookStatus(book) === selectedStatus)
    .slice()
    .sort(compareBooks);
}

export function getDaysUntilTarget(
  targetDate: string,
  now: Date = new Date(),
): number | null {
  const target = new Date(targetDate);
  if (Number.isNaN(target.getTime())) return null;

  const targetDay = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const todayDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((targetDay - todayDay) / 86_400_000);
}
