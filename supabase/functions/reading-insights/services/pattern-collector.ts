import { SupabaseClient } from "@supabase/supabase-js";
import { ContractError } from "../../_shared/consumer-contract.ts";
import type {
  ReadingPatterns,
  MonthlyReadingCount,
  GenreDistribution,
  ReadingHabitPattern,
  CompletionRates,
  HighlightStats,
  YearOverYearComparison,
  BookRecord,
  ProgressRecord,
  EmbeddingRecord,
} from "../types.ts";

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "must", "shall", "can", "need", "dare",
  "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by",
  "from", "as", "into", "through", "during", "before", "after", "above",
  "below", "between", "under", "and", "but", "or", "nor", "so", "yet",
  "both", "either", "neither", "not", "only", "own", "same", "than",
  "too", "very", "just",
  "이", "그", "저", "것", "수", "등", "더", "때", "년", "월", "일",
  "위", "중", "내", "를", "을", "에", "의", "가", "와", "과", "도",
  "로", "으로", "만", "이다", "있다", "하다", "되다", "않다",
]);

export class PatternCollector {
  constructor(private supabase: SupabaseClient) {}

  async collect(userId: string): Promise<ReadingPatterns> {
    const allBooks = await this.fetchAllBooks(userId);
    const allProgress = await this.fetchAllProgress(userId);
    const allEmbeddings = await this.fetchAllEmbeddings(userId);

    const monthlyReadingCounts = this.calculateMonthlyReadingCounts(allBooks);
    const genreDistribution = this.calculateGenreDistribution(allBooks);
    const readingHabits = this.calculateReadingHabits(allProgress);
    const completionRates = this.calculateCompletionRates(allBooks);
    const highlightStats = this.calculateHighlightStats(allBooks, allEmbeddings);
    const yearOverYear = this.calculateYearOverYear(allBooks, allEmbeddings);

    return {
      userId,
      collectedAt: new Date().toISOString(),
      monthlyReadingCounts,
      genreDistribution,
      readingHabits,
      completionRates,
      highlightStats,
      yearOverYear,
    };
  }

  private async fetchAllBooks(userId: string): Promise<BookRecord[]> {
    const { data, error } = await this.supabase
      .from("books")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw new ContractError(503, "unavailable", "Reading insights are unavailable");
    return (data as BookRecord[]) || [];
  }

  private async fetchAllProgress(userId: string): Promise<ProgressRecord[]> {
    const { data, error } = await this.supabase
      .from("reading_progress_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) throw new ContractError(503, "unavailable", "Reading insights are unavailable");
    return (data as ProgressRecord[]) || [];
  }

  private async fetchAllEmbeddings(userId: string): Promise<EmbeddingRecord[]> {
    const { data, error } = await this.supabase
      .from("reading_content_embeddings")
      .select("id, user_id, book_id, content_type, content_text, page_number, source_id")
      .eq("user_id", userId);

    if (error) throw new ContractError(503, "unavailable", "Reading insights are unavailable");
    return (data as EmbeddingRecord[]) || [];
  }

  private calculateMonthlyReadingCounts(books: BookRecord[]): MonthlyReadingCount[] {
    const completedBooks = books.filter((b) => b.status === "completed");
    const monthCounts: Record<string, number> = {};

    for (const book of completedBooks) {
      const completedDate = book.updated_at ? new Date(book.updated_at) : new Date(book.created_at);
      const monthKey = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, "0")}`;
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    }

    return Object.entries(monthCounts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private calculateGenreDistribution(books: BookRecord[]): GenreDistribution[] {
    const completedBooks = books.filter((b) => b.status === "completed" && b.genre);
    const total = completedBooks.length;

    if (total === 0) return [];

    const genreCounts: Record<string, number> = {};
    for (const book of completedBooks) {
      const genre = book.genre!;
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    }

    return Object.entries(genreCounts)
      .map(([genre, count]) => ({
        genre,
        count,
        percentage: Math.round((count / total) * 100 * 10) / 10,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private calculateReadingHabits(progress: ProgressRecord[]): ReadingHabitPattern {
    const hourDistribution: Record<number, number> = {};
    const dayOfWeekDistribution: Record<number, number> = {};

    for (let i = 0; i < 24; i++) hourDistribution[i] = 0;
    for (let i = 0; i < 7; i++) dayOfWeekDistribution[i] = 0;

    for (const record of progress) {
      const date = new Date(record.created_at);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();

      hourDistribution[hour]++;
      dayOfWeekDistribution[dayOfWeek]++;
    }

    let peakReadingHour: number | null = null;
    let peakReadingDay: number | null = null;
    let maxHourCount = 0;
    let maxDayCount = 0;

    for (const [hour, count] of Object.entries(hourDistribution)) {
      if (count > maxHourCount) {
        maxHourCount = count;
        peakReadingHour = parseInt(hour);
      }
    }

    for (const [day, count] of Object.entries(dayOfWeekDistribution)) {
      if (count > maxDayCount) {
        maxDayCount = count;
        peakReadingDay = parseInt(day);
      }
    }

    if (maxHourCount === 0) peakReadingHour = null;
    if (maxDayCount === 0) peakReadingDay = null;

    return {
      hourDistribution,
      dayOfWeekDistribution,
      peakReadingHour,
      peakReadingDay,
    };
  }

  private calculateCompletionRates(books: BookRecord[]): CompletionRates {
    const totalStarted = books.length;
    const completed = books.filter((b) => b.status === "completed").length;
    const abandoned = books.filter((b) => b.status === "abandoned").length;
    const inProgress = books.filter((b) => b.status === "reading").length;

    const completionRate = totalStarted > 0 ? Math.round((completed / totalStarted) * 100 * 10) / 10 : 0;
    const abandonRate = totalStarted > 0 ? Math.round((abandoned / totalStarted) * 100 * 10) / 10 : 0;

    const retryBooks = books.filter((b) => b.attempt_count > 1);
    const retrySuccesses = retryBooks.filter((b) => b.status === "completed").length;
    const retrySuccessRate = retryBooks.length > 0
      ? Math.round((retrySuccesses / retryBooks.length) * 100 * 10) / 10
      : 0;

    return {
      totalStarted,
      completed,
      abandoned,
      inProgress,
      completionRate,
      abandonRate,
      retrySuccessRate,
    };
  }

  private calculateHighlightStats(books: BookRecord[], embeddings: EmbeddingRecord[]): HighlightStats {
    const highlights = embeddings.filter((e) => e.content_type === "highlight");
    const totalCount = highlights.length;

    const bookGenreMap = new Map<string, string>();
    for (const book of books) {
      if (book.genre) {
        bookGenreMap.set(book.id, book.genre);
      }
    }

    const byGenre: Record<string, number> = {};
    for (const highlight of highlights) {
      const genre = bookGenreMap.get(highlight.book_id);
      if (genre) {
        byGenre[genre] = (byGenre[genre] || 0) + 1;
      }
    }

    const allHighlightText = highlights.map((h) => h.content_text).join(" ");
    const topKeywords = this.extractKeywords(allHighlightText, 10);

    return {
      totalCount,
      byGenre,
      topKeywords,
    };
  }

  private calculateYearOverYear(books: BookRecord[], embeddings: EmbeddingRecord[]): YearOverYearComparison {
    const now = new Date();
    const currentYear = now.getFullYear();
    const previousYear = currentYear - 1;

    const currentYearBooks = books.filter((b) => {
      if (b.status !== "completed") return false;
      const completedDate = b.updated_at ? new Date(b.updated_at) : new Date(b.created_at);
      return completedDate.getFullYear() === currentYear;
    });

    const previousYearBooks = books.filter((b) => {
      if (b.status !== "completed") return false;
      const completedDate = b.updated_at ? new Date(b.updated_at) : new Date(b.created_at);
      return completedDate.getFullYear() === previousYear;
    });

    const currentYearCompleted = currentYearBooks.length;
    const previousYearCompleted = previousYearBooks.length;

    const changePercentage = previousYearCompleted > 0
      ? Math.round(((currentYearCompleted - previousYearCompleted) / previousYearCompleted) * 100 * 10) / 10
      : currentYearCompleted > 0 ? 100 : 0;

    const currentYearBookIds = new Set(currentYearBooks.map((b) => b.id));
    const previousYearBookIds = new Set(previousYearBooks.map((b) => b.id));

    const currentYearHighlights = embeddings.filter(
      (e) => e.content_type === "highlight" && currentYearBookIds.has(e.book_id)
    ).length;

    const previousYearHighlights = embeddings.filter(
      (e) => e.content_type === "highlight" && previousYearBookIds.has(e.book_id)
    ).length;

    return {
      currentYear,
      previousYear,
      currentYearCompleted,
      previousYearCompleted,
      changePercentage,
      currentYearHighlights,
      previousYearHighlights,
    };
  }

  private extractKeywords(text: string, topN: number = 10): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\sㄱ-ㅎ가-힣]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    const wordCount: Record<string, number> = {};
    words.forEach((w) => {
      wordCount[w] = (wordCount[w] || 0) + 1;
    });

    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, topN)
      .map(([word]) => word);
  }
}
