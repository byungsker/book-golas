export interface DailyReminderBook {
  id: string;
  user_id: string;
  title: string;
  current_page: number | null;
  total_pages: number | null;
  updated_at: string | null;
  status: string | null;
}

export function selectDailyReminderBook(
  books: DailyReminderBook[],
): DailyReminderBook | null {
  const readingBooks = books.filter((book) => book.status === "reading");
  if (readingBooks.length === 0) return null;

  return readingBooks.sort((a, b) => {
    const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return bTime - aTime;
  })[0];
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
