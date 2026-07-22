import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface ExportRequest {
  userId: string;
  email: string;
  year?: number;
}

interface BookData {
  id: string;
  title: string;
  author: string;
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
  memoCount?: number;
}

function escapeCsvField(field: string | null | undefined): string {
  if (field === null || field === undefined) return "";
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${
      String(date.getMonth() + 1).padStart(2, "0")
    }-${String(date.getDate()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    reading: "읽는 중",
    completed: "완독",
    will_read: "읽을 예정",
    will_retry: "다시 도전",
    paused: "잠시 중단",
  };
  return statusMap[status] || status;
}

function generateCsv(books: BookData[]): string {
  const headers = [
    "제목",
    "저자",
    "장르",
    "출판사",
    "ISBN",
    "독서상태",
    "별점",
    "한줄평",
    "도서링크",
    "독후감링크",
    "시작일",
    "완독일",
    "페이지",
    "메모개수",
  ];

  const rows = books.map((book) => [
    escapeCsvField(book.title),
    escapeCsvField(book.author),
    escapeCsvField(book.genre),
    escapeCsvField(book.publisher),
    escapeCsvField(book.isbn),
    escapeCsvField(translateStatus(book.status)),
    book.rating ? String(book.rating) : "",
    escapeCsvField(book.review),
    escapeCsvField(book.aladin_url),
    escapeCsvField(book.review_link),
    formatDate(book.start_date),
    book.status === "completed" ? formatDate(book.updated_at) : "",
    String(book.total_pages || 0),
    String(book.memoCount || 0),
  ]);

  const bom = "\uFEFF";
  return bom +
    [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

async function sendEmailWithResend(
  email: string,
  csvContent: string,
  year: number,
  bookCount: number,
): Promise<void> {
  const base64Csv = btoa(unescape(encodeURIComponent(csvContent)));

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "북골라스 <noreply@bookgolas.com>",
      to: [email],
      subject: `[북골라스] ${year}년 독서 기록 내보내기`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a;">📚 ${year}년 독서 기록</h2>
          <p style="color: #666; line-height: 1.6;">
            안녕하세요!<br/>
            요청하신 ${year}년 독서 기록을 첨부파일로 보내드립니다.
          </p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #333;">
              <strong>총 ${bookCount}권</strong>의 독서 기록이 포함되어 있습니다.
            </p>
          </div>
          <p style="color: #666; font-size: 14px;">
            CSV 파일은 엑셀, 구글 스프레드시트, 노션 등에서 열 수 있습니다.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">
            북골라스 - 당신의 독서 여정을 함께합니다
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `bookgolas_${year}_reading_data.csv`,
          content: base64Csv,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${error}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader ?? "" } } },
    );
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const { userId, email, year }: ExportRequest = await req.json();

    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, email" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    if (
      userId !== user.id || email.toLowerCase() !== user.email?.toLowerCase()
    ) {
      return new Response(
        JSON.stringify({ error: "Request does not match authenticated user" }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    const targetYear = year || new Date().getFullYear();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const startOfYear = new Date(targetYear, 0, 1).toISOString();
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59).toISOString();

    const { data: books, error: booksError } = await supabaseClient
      .from("books")
      .select(
        `
        id,
        title,
        author,
        genre,
        publisher,
        isbn,
        status,
        rating,
        review,
        aladin_url,
        review_link,
        start_date,
        updated_at,
        total_pages
      `,
      )
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("created_at", startOfYear)
      .lte("created_at", endOfYear)
      .order("created_at", { ascending: false });

    if (booksError) {
      throw booksError;
    }

    const bookIds = books?.map((b: BookData) => b.id) || [];
    let memoCounts: Record<string, number> = {};

    if (bookIds.length > 0) {
      const { data: memos } = await supabaseClient
        .from("memos")
        .select("book_id")
        .in("book_id", bookIds)
        .is("deleted_at", null);

      if (memos) {
        memoCounts = memos.reduce(
          (acc: Record<string, number>, memo: { book_id: string }) => {
            acc[memo.book_id] = (acc[memo.book_id] || 0) + 1;
            return acc;
          },
          {},
        );
      }
    }

    const booksWithMemoCount: BookData[] = (books || []).map((
      book: BookData,
    ) => ({
      ...book,
      memoCount: memoCounts[book.id] || 0,
    }));

    const csvContent = generateCsv(booksWithMemoCount);

    await sendEmailWithResend(
      email,
      csvContent,
      targetYear,
      booksWithMemoCount.length,
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `${targetYear}년 독서 기록이 ${email}로 전송되었습니다.`,
        bookCount: booksWithMemoCount.length,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
});
