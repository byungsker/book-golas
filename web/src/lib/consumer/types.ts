export const consumerBookSelect =
  "id,title,author,start_date,target_date,image_url,current_page,total_pages,status,created_at,updated_at,deleted_at";

export type ConsumerBookStatus =
  | "planned"
  | "reading"
  | "completed"
  | "will_retry"
  | "unknown";

export type ConsumerBook = {
  id: string;
  title: string;
  author: string | null;
  startDate: string;
  targetDate: string;
  imageUrl: string | null;
  currentPage: number;
  totalPages: number;
  status: ConsumerBookStatus;
  createdAt: string | null;
  updatedAt: string | null;
};

export function parseConsumerBook(
  value: Record<string, unknown>,
): ConsumerBook | null {
  if (typeof value.id !== "string" || typeof value.title !== "string") {
    return null;
  }

  if (
    typeof value.start_date !== "string" ||
    typeof value.target_date !== "string"
  ) {
    return null;
  }

  const currentPage = toSafeInteger(value.current_page);
  const totalPages = toSafeInteger(value.total_pages);
  const rawStatus = value.status;

  if (!isValidReadingPage(currentPage, totalPages)) return null;

  return {
    id: value.id,
    title: value.title,
    author: typeof value.author === "string" ? value.author : null,
    startDate: value.start_date,
    targetDate: value.target_date,
    imageUrl: typeof value.image_url === "string" ? value.image_url : null,
    currentPage,
    totalPages,
    status: isConsumerBookStatus(rawStatus) ? rawStatus : "unknown",
    createdAt: typeof value.created_at === "string" ? value.created_at : null,
    updatedAt: typeof value.updated_at === "string" ? value.updated_at : null,
  };
}

export function getBookProgress(book: ConsumerBook): number {
  if (book.totalPages <= 0) return 0;
  return Math.min(100, Math.max(0, (book.currentPage / book.totalPages) * 100));
}

export function isValidReadingPage(currentPage: number, totalPages: number): boolean {
  return (
    Number.isSafeInteger(currentPage) &&
    Number.isSafeInteger(totalPages) &&
    currentPage >= 0 &&
    totalPages >= 0 &&
    currentPage <= totalPages
  );
}

export function formatBookDate(value: string | null, locale: string): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function toSafeInteger(value: unknown): number {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  return 0;
}

export function isConsumerBookStatus(
  value: unknown,
): value is Exclude<ConsumerBookStatus, "unknown"> {
  return (
    value === "planned" ||
    value === "reading" ||
    value === "completed" ||
    value === "will_retry"
  );
}

export function isBookId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
