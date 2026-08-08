import { SupabaseClient } from "@supabase/supabase-js";
import type {
  BookReadingAnalytics,
  BookRecord,
  EmbeddingRecord,
  ProgressRecord,
  UserReadingProfile,
} from "../types.ts";
import {
  calculateAggregateStats,
  calculateDailyGoalAchievementRate,
} from "../utils/analytics-calculator.ts";
import { extractUserInterests } from "./rag-service.ts";

export class ProfileCollector {
  constructor(private supabase: SupabaseClient) {}

  async collect(
    userId: string,
    beforeProviderCall: (input: string) => Promise<void> = async () => {},
  ): Promise<UserReadingProfile> {
    const completedBooks = await this.fetchCompletedBooks(userId);
    const booksAnalytics = await this.analyzeBooksInDetail(completedBooks);
    const stats = calculateAggregateStats(booksAnalytics);
    const interests = await extractUserInterests(
      this.supabase,
      userId,
      beforeProviderCall,
    );

    return {
      userId,
      books: booksAnalytics,
      stats,
      interests,
    };
  }

  private async fetchCompletedBooks(userId: string): Promise<BookRecord[]> {
    const { data, error } = await this.supabase
      .from("books")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "completed")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (error) throw new Error(`Books query failed: ${error.message}`);
    return (data as BookRecord[]) || [];
  }

  private async analyzeBooksInDetail(
    books: BookRecord[],
  ): Promise<BookReadingAnalytics[]> {
    const analytics: BookReadingAnalytics[] = [];

    for (const book of books) {
      const progressRecords = await this.fetchProgressRecords(book.id);
      const embeddings = await this.fetchEmbeddings(book.id);

      const highlightCount = embeddings.filter(
        (e) => e.content_type === "highlight",
      ).length;
      const noteCount = embeddings.filter(
        (e) => e.content_type === "note",
      ).length;
      const photoOcrCount = embeddings.filter(
        (e) => e.content_type === "photo_ocr",
      ).length;

      const startDate = new Date(book.start_date);
      const completedDate = book.updated_at
        ? new Date(book.updated_at)
        : new Date();
      const daysToComplete = Math.max(
        1,
        Math.ceil(
          (completedDate.getTime() - startDate.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );
      const averagePagesPerDay = daysToComplete > 0
        ? book.total_pages / daysToComplete
        : 0;

      const dailyGoalAchievementRate = calculateDailyGoalAchievementRate(
        book.daily_target_pages,
        progressRecords,
      );

      analytics.push({
        bookId: book.id,
        title: book.title,
        author: book.author || "Unknown",
        genre: book.genre,
        daysToComplete,
        averagePagesPerDay: Math.round(averagePagesPerDay * 10) / 10,
        highlightCount,
        noteCount,
        photoOcrCount,
        totalEngagement: highlightCount + noteCount + photoOcrCount,
        rating: book.rating,
        hasReview: !!book.review,
        dailyGoalAchievementRate,
        attemptCount: book.attempt_count || 1,
        completed: true,
      });
    }

    return analytics;
  }

  private async fetchProgressRecords(
    bookId: string,
  ): Promise<ProgressRecord[]> {
    const { data } = await this.supabase
      .from("reading_progress_history")
      .select("*")
      .eq("book_id", bookId)
      .order("created_at", { ascending: true });

    return (data as ProgressRecord[]) || [];
  }

  private async fetchEmbeddings(bookId: string): Promise<EmbeddingRecord[]> {
    const { data } = await this.supabase
      .from("reading_content_embeddings")
      .select(
        "id, user_id, book_id, content_type, content_text, page_number, source_id",
      )
      .eq("book_id", bookId);

    return (data as EmbeddingRecord[]) || [];
  }
}
