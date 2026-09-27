import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  ContractError,
  createServiceClient,
  enforceFunctionRateLimit,
  fetchProvider,
  jsonResponse,
  methodGuard,
  optionsResponse,
  parseJsonBody,
  providerFailure,
  requireProviderSecret,
  requireString,
  requireUser,
  responseForError,
} from "../_shared/consumer-contract.ts";

interface BookData {
  id: string;
  title: string;
  author: string | null;
  genre: string | null;
  publisher: string | null;
  isbn: string | null;
  status: string;
  rating: number | null;
  review: string | null;
  aladin_url: string | null;
  review_link: string | null;
  start_date: string | null;
  updated_at: string;
  total_pages: number;
  created_at: string;
  memoCount?: number;
  imageCount?: number;
}

interface ReadingRecordData {
  id: string;
  book_id: string;
  content_type: string;
  content_text: string;
  page_number: number | null;
  source_id: string | null;
  created_at: string;
}

interface ProgressData {
  id: string;
  book_id: string;
  page: number;
  previous_page: number | null;
  reading_time: number | null;
  memo: string | null;
  progress_type: string | null;
  created_at: string;
}

interface SessionData {
  id: string;
  book_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  created_at: string;
}

interface GoalData {
  id: string;
  year: number;
  target_books: number;
  created_at: string;
  updated_at: string;
}

interface RecallHistoryData {
  id: string;
  book_id: string | null;
  query: string;
  answer: string | null;
  sources: unknown;
  created_at: string;
}

interface NoteStructureData {
  id: string;
  book_id: string;
  structure_json: unknown;
  created_at: string;
  updated_at: string;
}

interface InsightMemoryData {
  id: string;
  insight_content: string;
  insight_metadata: unknown;
  created_at: string;
  expires_at: string;
}

interface RecommendationData {
  id: string;
  recommendations: unknown;
  profile_summary: unknown;
  created_at: string;
  expires_at: string;
}

interface RecallUsageData {
  id: string;
  recall_id: string | null;
  used_at: string;
  subscription_status: string;
  created_at: string;
}

interface ExportGraph {
  progress: ProgressData[];
  sessions: SessionData[];
  records: ReadingRecordData[];
  images: ImageData[];
  goals: GoalData[];
  recallHistory: RecallHistoryData[];
  noteStructures: NoteStructureData[];
  insights: InsightMemoryData[];
  recommendations: RecommendationData[];
  recallUsage: RecallUsageData[];
}

interface ImageData {
  id: string;
  book_id: string;
  image_url: string | null;
  caption: string | null;
  extracted_text: string | null;
  page_number: number | null;
  highlights: unknown;
  created_at: string;
  user_id: string | null;
}

const MAX_EXPORT_BOOKS = 1_000;
const MAX_EXPORT_RECORDS = 10_000;
const MAX_EXPORT_IMAGES = 5_000;
const MAX_EXPORT_SESSIONS = 10_000;
const MAX_EXPORT_ARTIFACTS = 5_000;
const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
const MAX_PROVIDER_RESPONSE_BYTES = 128 * 1024;
const MIN_EXPORT_YEAR = 2000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  if (bytes.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new ContractError(413, "export_too_large", "Export attachment is too large");
  }

  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function escapeCsvField(field: string | number | null | undefined): string {
  if (field === null || field === undefined) return "";
  const rawValue = String(field);
  const value = typeof field === "string" && /^[=+\-@\t\r\n]/.test(rawValue)
    ? `'${rawValue}`
    : rawValue;
  return value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")
    ? `"${value.replace(/"/g, '""')}"`
    : value;
}

function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function translateStatus(status: string): string {
  return ({ reading: "읽는 중", completed: "완독", will_read: "읽을 예정", will_retry: "다시 도전" } as Record<string, string>)[status] ?? status;
}

function serializeField(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function generateCsv(books: BookData[], graph: ExportGraph): string {
  const bookTitles = new Map(books.map((book) => [book.id, book.title]));
  const headers = ["종류", "책ID", "책제목", "저자", "장르", "출판사", "ISBN", "독서상태", "별점", "한줄평", "페이지", "내용", "원본ID", "이미지URL", "기록일"];
  const bookRows = books.map((book) => [
    "book",
    book.id,
    book.title,
    book.author,
    book.genre,
    book.publisher,
    book.isbn,
    translateStatus(book.status),
    book.rating,
    book.review,
    book.total_pages || 0,
    "",
    "",
    "",
    formatDate(book.updated_at),
  ]);
  const recordRows = graph.records.map((record) => [
    record.content_type,
    record.book_id,
    bookTitles.get(record.book_id) ?? "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    record.page_number,
    record.content_text,
    record.source_id,
    "",
    formatDate(record.created_at),
  ]);
  const imageRows = graph.images.map((image) => [
    "image",
    image.book_id,
    bookTitles.get(image.book_id) ?? "",
    "",
    "",
    "",
    "",
    "",
    "",
    image.caption,
    image.page_number,
    image.extracted_text,
    image.id,
    image.image_url,
    formatDate(image.created_at),
  ]);
  const progressRows = graph.progress.map((progress) => [
    "progress",
    progress.book_id,
    bookTitles.get(progress.book_id) ?? "",
    "",
    "",
    "",
    "",
    "",
    "",
    progress.memo,
    progress.page,
    progress.reading_time,
    progress.id,
    "",
    formatDate(progress.created_at),
  ]);
  const sessionRows = graph.sessions.map((session) => [
    "session",
    session.book_id,
    bookTitles.get(session.book_id) ?? "",
    "",
    "",
    "",
    "",
    "",
    "",
    session.ended_at,
    session.duration_seconds,
    "",
    session.id,
    "",
    formatDate(session.started_at),
  ]);
  const goalRows = graph.goals.map((goal) => [
    "goal",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    goal.target_books,
    goal.year,
    "",
    "",
    goal.id,
    "",
    formatDate(goal.updated_at),
  ]);
  const recallRows = graph.recallHistory.map((recall) => [
    "recall",
    recall.book_id,
    recall.book_id ? bookTitles.get(recall.book_id) ?? "" : "",
    "",
    "",
    "",
    "",
    "",
    "",
    recall.query,
    "",
    recall.answer,
    recall.id,
    serializeField(recall.sources),
    formatDate(recall.created_at),
  ]);
  const structureRows = graph.noteStructures.map((structure) => [
    "note_structure",
    structure.book_id,
    bookTitles.get(structure.book_id) ?? "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    serializeField(structure.structure_json),
    structure.id,
    "",
    formatDate(structure.updated_at),
  ]);
  const insightRows = graph.insights.map((insight) => [
    "insight",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    insight.insight_content,
    insight.id,
    serializeField(insight.insight_metadata),
    formatDate(insight.created_at),
  ]);
  const recommendationRows = graph.recommendations.map((recommendation) => [
    "recommendation",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    serializeField(recommendation.recommendations),
    recommendation.id,
    serializeField(recommendation.profile_summary),
    formatDate(recommendation.created_at),
  ]);
  const usageRows = graph.recallUsage.map((usage) => [
    "recall_usage",
    "",
    "",
    "",
    "",
    "",
    "",
    usage.subscription_status,
    "",
    "",
    usage.recall_id,
    usage.id,
    "",
    formatDate(usage.used_at),
  ]);
  const rows = [
    ...bookRows,
    ...progressRows,
    ...sessionRows,
    ...recordRows,
    ...imageRows,
    ...goalRows,
    ...recallRows,
    ...structureRows,
    ...insightRows,
    ...recommendationRows,
    ...usageRows,
  ].map((row) => row.map(escapeCsvField).join(","));
  return "\uFEFF" + [headers.join(","), ...rows].join("\n");
}

async function sendEmail(
  email: string,
  attachment: string,
  year: number,
  format: "json" | "csv",
  apiKey: string,
): Promise<void> {
  const response = await fetchProvider("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: "북골라스 <noreply@bookgolas.com>",
      to: [email],
      subject: `[북골라스] ${year}년 독서 기록 내보내기`,
      html: `<p>요청하신 ${year}년 독서 기록을 첨부했습니다.</p>`,
      attachments: [{
        filename: `bookgolas_reading_data.${format}`,
        content: encodeBase64(attachment),
      }],
    }),
  }, 15_000, MAX_PROVIDER_RESPONSE_BYTES);
  if (!response.ok) throw new Error(`provider_status:${response.status}`);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse(req);

  try {
    methodGuard(req);
    const { user } = await requireUser(req);
    const body = await parseJsonBody(req);
    if (["userId", "user_id", "owner_id", "p_user_id"].some((key) => key in body)) {
      throw new ContractError(400, "invalid_request", "Export ownership is derived from the authenticated account");
    }
    const formatValue = requireString(body, "format", 8);
    if (formatValue !== "json" && formatValue !== "csv") {
      throw new ContractError(400, "invalid_request", "format must be json or csv");
    }
    if (typeof body.includeImages !== "boolean") {
      throw new ContractError(400, "invalid_request", "includeImages must be a boolean");
    }
    if (!user.email) throw new ContractError(400, "invalid_request", "Authenticated user has no email address");
    const currentYear = new Date().getUTCFullYear();
    const targetYear = requireInteger(body, "year", MIN_EXPORT_YEAR, currentYear);
    const requestedEmail = requireString(body, "email", 320);
    if (!EMAIL_PATTERN.test(requestedEmail)) {
      throw new ContractError(400, "invalid_request", "email must be a valid email address");
    }
    if (requestedEmail.toLowerCase() !== user.email.toLowerCase()) {
      throw new ContractError(403, "forbidden", "Export email does not match the authenticated account");
    }

    const serviceClient = createServiceClient();
    await enforceFunctionRateLimit(serviceClient, user.id, "export-reading-data", 3, 24 * 60 * 60);
    const startOfYear = new Date(Date.UTC(targetYear, 0, 1)).toISOString();
    const endOfYear = new Date(Date.UTC(targetYear + 1, 0, 1) - 1).toISOString();
    const { data: books, error: booksError } = await serviceClient
      .from("books")
      .select("id, title, author, genre, publisher, isbn, status, rating, review, aladin_url, review_link, start_date, updated_at, total_pages, created_at")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("created_at", startOfYear)
      .lte("created_at", endOfYear)
      .order("created_at", { ascending: false })
      .limit(MAX_EXPORT_BOOKS + 1);
    if (booksError) throw new ContractError(503, "unavailable", "Reading data is unavailable");

    const typedBooks = (books ?? []) as BookData[];
    if (typedBooks.length > MAX_EXPORT_BOOKS) {
      throw new ContractError(413, "export_too_large", "Export contains too many books");
    }
    const bookIds = typedBooks.map((book) => book.id);
    const emptyResult = { data: [], error: null };
    const [
      progressResult,
      sessionResult,
      contentResult,
      imageResult,
      goalsResult,
      recallResult,
      structuresResult,
      insightsResult,
      recommendationsResult,
      usageResult,
    ] = await Promise.all([
      bookIds.length > 0
        ? serviceClient
            .from("reading_progress_history")
            .select("id, book_id, page, previous_page, reading_time, memo, progress_type, created_at")
            .eq("user_id", user.id)
            .in("book_id", bookIds)
            .gte("created_at", startOfYear)
            .lte("created_at", endOfYear)
            .order("created_at", { ascending: true })
            .limit(MAX_EXPORT_RECORDS + 1)
        : Promise.resolve(emptyResult),
      bookIds.length > 0
        ? serviceClient
            .from("reading_sessions")
            .select("id, book_id, started_at, ended_at, duration_seconds, created_at")
            .eq("user_id", user.id)
            .in("book_id", bookIds)
            .gte("started_at", startOfYear)
            .lte("started_at", endOfYear)
            .order("started_at", { ascending: true })
            .limit(MAX_EXPORT_SESSIONS + 1)
        : Promise.resolve(emptyResult),
      bookIds.length > 0
        ? serviceClient
            .from("reading_content_embeddings")
            .select("id, book_id, content_type, content_text, page_number, source_id, created_at")
            .eq("user_id", user.id)
            .in("book_id", bookIds)
            .gte("created_at", startOfYear)
            .lte("created_at", endOfYear)
            .order("created_at", { ascending: true })
            .limit(MAX_EXPORT_RECORDS + 1)
        : Promise.resolve(emptyResult),
      body.includeImages && bookIds.length > 0
        ? serviceClient
            .from("book_images")
            .select("id, book_id, image_url, caption, extracted_text, page_number, highlights, created_at, user_id")
            .in("book_id", bookIds)
            .or(`user_id.is.null,user_id.eq.${user.id}`)
            .gte("created_at", startOfYear)
            .lte("created_at", endOfYear)
            .limit(MAX_EXPORT_IMAGES + 1)
        : Promise.resolve(emptyResult),
      serviceClient
        .from("reading_goals")
        .select("id, year, target_books, created_at, updated_at")
        .eq("user_id", user.id)
        .eq("year", targetYear)
        .limit(1),
      serviceClient
        .from("recall_search_history")
        .select("id, book_id, query, answer, sources, created_at")
        .eq("user_id", user.id)
        .gte("created_at", startOfYear)
        .lte("created_at", endOfYear)
        .order("created_at", { ascending: true })
        .limit(MAX_EXPORT_ARTIFACTS + 1),
      bookIds.length > 0
        ? serviceClient
            .from("note_structures")
            .select("id, book_id, structure_json, created_at, updated_at")
            .eq("user_id", user.id)
            .in("book_id", bookIds)
            .gte("updated_at", startOfYear)
            .lte("updated_at", endOfYear)
            .order("updated_at", { ascending: true })
            .limit(MAX_EXPORT_ARTIFACTS + 1)
        : Promise.resolve(emptyResult),
      serviceClient
        .from("reading_insights_memory")
        .select("id, insight_content, insight_metadata, created_at, expires_at")
        .eq("user_id", user.id)
        .gte("created_at", startOfYear)
        .lte("created_at", endOfYear)
        .order("created_at", { ascending: true })
        .limit(MAX_EXPORT_ARTIFACTS + 1),
      serviceClient
        .from("book_recommendations")
        .select("id, recommendations, profile_summary, created_at, expires_at")
        .eq("user_id", user.id)
        .gte("created_at", startOfYear)
        .lte("created_at", endOfYear)
        .order("created_at", { ascending: true })
        .limit(MAX_EXPORT_ARTIFACTS + 1),
      serviceClient
        .from("ai_recall_usage")
        .select("id, recall_id, used_at, subscription_status, created_at")
        .eq("user_id", user.id)
        .gte("used_at", startOfYear)
        .lte("used_at", endOfYear)
        .order("used_at", { ascending: true })
        .limit(MAX_EXPORT_ARTIFACTS + 1),
    ]);

    const results = [
      progressResult,
      sessionResult,
      contentResult,
      imageResult,
      goalsResult,
      recallResult,
      structuresResult,
      insightsResult,
      recommendationsResult,
      usageResult,
    ];
    if (results.some((result) => result.error)) {
      throw new ContractError(503, "unavailable", "Reading data is unavailable");
    }
    if ((progressResult.data ?? []).length > MAX_EXPORT_RECORDS || (contentResult.data ?? []).length > MAX_EXPORT_RECORDS) {
      throw new ContractError(413, "export_too_large", "Export contains too many reading records");
    }
    if ((sessionResult.data ?? []).length > MAX_EXPORT_SESSIONS) {
      throw new ContractError(413, "export_too_large", "Export contains too many reading sessions");
    }
    if ((imageResult.data ?? []).length > MAX_EXPORT_IMAGES) {
      throw new ContractError(413, "export_too_large", "Export contains too many images");
    }
    if ([recallResult, structuresResult, insightsResult, recommendationsResult, usageResult].some((result) => (result.data ?? []).length > MAX_EXPORT_ARTIFACTS)) {
      throw new ContractError(413, "export_too_large", "Export contains too many derived records");
    }

    const selectedBookIds = new Set(bookIds);
    const progress = (progressResult.data ?? []) as ProgressData[];
    const sessions = (sessionResult.data ?? []) as SessionData[];
    const records = (contentResult.data ?? []) as ReadingRecordData[];
    const images = (imageResult.data ?? [])
      .filter((row) => {
        const image = row as { book_id?: unknown; user_id?: unknown };
        return selectedBookIds.has(String(image.book_id)) && (image.user_id === null || image.user_id === user.id);
      }) as ImageData[];
    const goals = (goalsResult.data ?? []) as GoalData[];
    const recallHistory = (recallResult.data ?? [])
      .filter((row) => {
        const bookId = (row as { book_id?: string | null }).book_id;
        return bookId === null || selectedBookIds.has(bookId);
      }) as RecallHistoryData[];
    const noteStructures = (structuresResult.data ?? []) as NoteStructureData[];
    const insights = (insightsResult.data ?? []) as InsightMemoryData[];
    const recommendations = (recommendationsResult.data ?? []) as RecommendationData[];
    const recallUsage = (usageResult.data ?? []) as RecallUsageData[];

    const memoCounts: Record<string, number> = {};
    const imageCounts: Record<string, number> = {};
    for (const record of records) memoCounts[record.book_id] = (memoCounts[record.book_id] ?? 0) + 1;
    for (const image of images) imageCounts[image.book_id] = (imageCounts[image.book_id] ?? 0) + 1;
    const exportBooks = typedBooks.map((book) => ({
      ...book,
      memoCount: memoCounts[book.id] ?? 0,
      imageCount: imageCounts[book.id] ?? 0,
    }));
    const graph: ExportGraph = {
      progress,
      sessions,
      records,
      images,
      goals,
      recallHistory,
      noteStructures,
      insights,
      recommendations,
      recallUsage,
    };
    const recordCount = progress.length + sessions.length + records.length + images.length + goals.length + recallHistory.length + noteStructures.length + insights.length + recommendations.length + recallUsage.length;
    const attachment = formatValue === "json"
      ? JSON.stringify({ exportedAt: new Date().toISOString(), year: targetYear, books: exportBooks, ...graph })
      : generateCsv(exportBooks, graph);
    if (new TextEncoder().encode(attachment).byteLength > MAX_ATTACHMENT_BYTES) {
      throw new ContractError(413, "export_too_large", "Export attachment is too large");
    }
    await sendEmail(user.email, attachment, targetYear, formatValue, requireProviderSecret("RESEND_API_KEY"));

    return jsonResponse({
      exportId: crypto.randomUUID(),
      year: targetYear,
      format: formatValue,
      status: "ready",
      bookCount: exportBooks.length,
      recordCount,
      downloadUrl: null,
      expiresAt: null,
    }, req);
  } catch (error) {
    if (error instanceof ContractError) return responseForError(error, req, "export-reading-data");
    return responseForError(providerFailure(error), req, "export-reading-data");
  }
});
