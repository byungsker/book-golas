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
const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
const MAX_PROVIDER_RESPONSE_BYTES = 128 * 1024;

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

function generateCsv(books: BookData[], records: ReadingRecordData[], images: ImageData[]): string {
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
  const recordRows = records.map((record) => [
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
  const imageRows = images.map((image) => [
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
  const rows = [...bookRows, ...recordRows, ...imageRows].map((row) => row.map(escapeCsvField).join(","));
  return "\uFEFF" + [headers.join(","), ...rows].join("\n");
}

async function sendEmail(
  email: string,
  attachment: string,
  format: "json" | "csv",
  apiKey: string,
): Promise<void> {
  const response = await fetchProvider("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: "북골라스 <noreply@bookgolas.com>",
      to: [email],
      subject: "[북골라스] 독서 기록 내보내기",
      html: "<p>요청하신 독서 기록을 첨부했습니다.</p>",
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
    if ("userId" in body || "email" in body || "year" in body) {
      throw new ContractError(400, "invalid_request", "Export identity and date are derived from the authenticated account");
    }
    const formatValue = requireString(body, "format", 8);
    if (formatValue !== "json" && formatValue !== "csv") {
      throw new ContractError(400, "invalid_request", "format must be json or csv");
    }
    if (typeof body.includeImages !== "boolean") {
      throw new ContractError(400, "invalid_request", "includeImages must be a boolean");
    }
    if (!user.email) throw new ContractError(400, "invalid_request", "Authenticated user has no email address");

    const serviceClient = createServiceClient();
    await enforceFunctionRateLimit(serviceClient, user.id, "export-reading-data", 3, 24 * 60 * 60);
    const { data: books, error: booksError } = await serviceClient
      .from("books")
      .select("id, title, author, genre, publisher, isbn, status, rating, review, aladin_url, review_link, start_date, updated_at, total_pages, created_at")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(MAX_EXPORT_BOOKS + 1);
    if (booksError) throw new ContractError(503, "unavailable", "Reading data is unavailable");

    const typedBooks = (books ?? []) as BookData[];
    if (typedBooks.length > MAX_EXPORT_BOOKS) {
      throw new ContractError(413, "export_too_large", "Export contains too many books");
    }
    const bookIds = typedBooks.map((book) => book.id);
    let records: ReadingRecordData[] = [];
    let images: ImageData[] = [];
    if (bookIds.length > 0) {
      const [{ data: contentRows, error: contentsError }, { data: imageRows, error: imagesError }] = await Promise.all([
        serviceClient
          .from("reading_content_embeddings")
          .select("id, book_id, content_type, content_text, page_number, source_id, created_at")
          .eq("user_id", user.id)
          .in("book_id", bookIds)
          .order("created_at", { ascending: true })
          .limit(MAX_EXPORT_RECORDS + 1),
        serviceClient
          .from("book_images")
          .select("id, book_id, image_url, caption, extracted_text, page_number, highlights, created_at, user_id")
          .in("book_id", bookIds)
          .or(`user_id.is.null,user_id.eq.${user.id}`)
          .limit(MAX_EXPORT_IMAGES + 1),
      ]);
      if (contentsError || imagesError) throw new ContractError(503, "unavailable", "Reading data is unavailable");
      if ((contentRows ?? []).length > MAX_EXPORT_RECORDS) {
        throw new ContractError(413, "export_too_large", "Export contains too many reading records");
      }
      if ((imageRows ?? []).length > MAX_EXPORT_IMAGES) {
        throw new ContractError(413, "export_too_large", "Export contains too many images");
      }
      records = (contentRows ?? []) as ReadingRecordData[];
      images = (imageRows ?? [])
        .filter((row) => {
          const userId = (row as { user_id?: string | null }).user_id;
          return userId === null || userId === undefined || userId === user.id;
        }) as ImageData[];
    }

    const memoCounts: Record<string, number> = {};
    const imageCounts: Record<string, number> = {};
    for (const record of records) memoCounts[record.book_id] = (memoCounts[record.book_id] ?? 0) + 1;
    for (const image of images) imageCounts[image.book_id] = (imageCounts[image.book_id] ?? 0) + 1;
    const exportBooks = typedBooks.map((book) => ({
      ...book,
      memoCount: memoCounts[book.id] ?? 0,
      imageCount: imageCounts[book.id] ?? 0,
    }));
    const exportImages = body.includeImages ? images : [];
    const attachment = formatValue === "json"
      ? JSON.stringify({ exportedAt: new Date().toISOString(), books: exportBooks, records, images: exportImages })
      : generateCsv(exportBooks, records, exportImages);
    if (new TextEncoder().encode(attachment).byteLength > MAX_ATTACHMENT_BYTES) {
      throw new ContractError(413, "export_too_large", "Export attachment is too large");
    }
    await sendEmail(user.email, attachment, formatValue, requireProviderSecret("RESEND_API_KEY"));

    return jsonResponse({
      exportId: crypto.randomUUID(),
      format: formatValue,
      status: "ready",
      downloadUrl: null,
      expiresAt: null,
    }, req);
  } catch (error) {
    if (error instanceof ContractError) return responseForError(error, req, "export-reading-data");
    return responseForError(providerFailure(error), req, "export-reading-data");
  }
});
