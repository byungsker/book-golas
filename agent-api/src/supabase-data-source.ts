import type {
  BookRecord,
  EntitlementRecord,
  InsightRecord,
  PageResult,
  ProgressRecord,
  RecallRecord,
} from "./contracts.ts";
import { type AgentReadDataSource, DataSourceError } from "./data-source.ts";

interface SupabaseRow {
  [key: string]: unknown;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function pageFromRows<T>(
  rows: SupabaseRow[],
  total: number | null,
  map: (row: SupabaseRow) => T,
): PageResult<T> {
  return { items: rows.map(map), total };
}

function parseTotal(response: Response): number | null {
  const range = response.headers.get("content-range");
  const match = /\/([0-9]+)$/.exec(range ?? "");
  return match ? Number(match[1]) : null;
}

function encodeLike(value: string): string {
  return value.replace(/[\\,*().]/g, " ").trim();
}

export class SupabaseDataSource implements AgentReadDataSource {
  constructor(
    private readonly supabaseUrl: string,
    private readonly anonKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async query<T extends SupabaseRow>(
    table: string,
    accessToken: string,
    params: Record<string, string>,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<{ rows: T[]; total: number | null }> {
    if (!this.supabaseUrl || !this.anonKey) {
      throw new DataSourceError(
        "Agent API data access is not configured",
        503,
        false,
      );
    }
    const url = new URL(`${this.supabaseUrl}/rest/v1/${table}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    url.searchParams.set("limit", String(pageSize));
    url.searchParams.set("offset", String((page - 1) * pageSize));

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          apikey: this.anonKey,
          Authorization: `Bearer ${accessToken}`,
          Prefer: "count=exact",
        },
        signal,
      });
    } catch {
      throw new DataSourceError("Data provider is unavailable", 503, true);
    }

    if (!response.ok) {
      const status = response.status === 401 || response.status === 403
        ? 403
        : response.status === 429
        ? 429
        : response.status >= 500
        ? 503
        : 502;
      throw new DataSourceError(
        "Data provider request failed",
        status,
        status === 429 || status === 503,
      );
    }

    const body = await response.json().catch(() => null);
    if (!Array.isArray(body)) {
      throw new DataSourceError(
        "Data provider returned an invalid response",
        502,
        false,
      );
    }
    return { rows: body as T[], total: parseTotal(response) };
  }

  private async single(
    table: string,
    accessToken: string,
    params: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<SupabaseRow> {
    if (!this.supabaseUrl || !this.anonKey) {
      throw new DataSourceError(
        "Agent API data access is not configured",
        503,
        false,
      );
    }
    const url = new URL(`${this.supabaseUrl}/rest/v1/${table}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    url.searchParams.set("limit", "1");
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          apikey: this.anonKey,
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
      });
    } catch {
      throw new DataSourceError("Data provider is unavailable", 503, true);
    }
    if (!response.ok) {
      const status = response.status === 401 || response.status === 403
        ? 403
        : response.status >= 500
        ? 503
        : 502;
      throw new DataSourceError(
        "Data provider request failed",
        status,
        status === 503,
      );
    }
    const body = await response.json().catch(() => null);
    if (!Array.isArray(body)) {
      throw new DataSourceError(
        "Data provider returned an invalid response",
        502,
        false,
      );
    }
    return (body[0] ?? {}) as SupabaseRow;
  }

  private book(row: SupabaseRow): BookRecord {
    return {
      id: String(row.id ?? ""),
      title: String(row.title ?? ""),
      author: asString(row.author),
      status: asString(row.status),
      current_page: asNumber(row.current_page),
      total_pages: asNumber(row.total_pages),
      updated_at: asString(row.updated_at),
    };
  }

  async searchBooks(
    userId: string,
    accessToken: string,
    query: string,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<PageResult<BookRecord>> {
    const escaped = encodeLike(query);
    const result = await this.query(
      "books",
      accessToken,
      {
        select: "id,title,author,status,current_page,total_pages,updated_at",
        user_id: `eq.${userId}`,
        deleted_at: "is.null",
        or: `(title.ilike.*${escaped}*,author.ilike.*${escaped}*)`,
        order: "updated_at.desc",
      },
      page,
      pageSize,
      signal,
    );
    return pageFromRows(result.rows, result.total, (row) => this.book(row));
  }

  async listLibrary(
    userId: string,
    accessToken: string,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<PageResult<BookRecord>> {
    const result = await this.query(
      "books",
      accessToken,
      {
        select: "id,title,author,status,current_page,total_pages,updated_at",
        user_id: `eq.${userId}`,
        deleted_at: "is.null",
        order: "updated_at.desc",
      },
      page,
      pageSize,
      signal,
    );
    return pageFromRows(result.rows, result.total, (row) => this.book(row));
  }

  async listProgress(
    userId: string,
    accessToken: string,
    bookId: string | null,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<PageResult<ProgressRecord>> {
    const params: Record<string, string> = {
      select:
        "id,book_id,page,previous_page,progress_type,reading_time,memo,created_at",
      user_id: `eq.${userId}`,
      order: "created_at.desc",
    };
    if (bookId) params.book_id = `eq.${bookId}`;
    const result = await this.query(
      "reading_progress_history",
      accessToken,
      params,
      page,
      pageSize,
      signal,
    );
    return pageFromRows(result.rows, result.total, (row) => ({
      id: String(row.id ?? ""),
      book_id: String(row.book_id ?? ""),
      page: asNumber(row.page),
      previous_page: asNumber(row.previous_page),
      progress_type: asString(row.progress_type),
      reading_time: asNumber(row.reading_time),
      memo: asString(row.memo),
      created_at: asString(row.created_at),
    }));
  }

  async listRecall(
    userId: string,
    accessToken: string,
    bookId: string | null,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<PageResult<RecallRecord>> {
    const params: Record<string, string> = {
      select: "id,book_id,query,answer,sources,created_at",
      user_id: `eq.${userId}`,
      order: "created_at.desc",
    };
    if (bookId) params.book_id = `eq.${bookId}`;
    const result = await this.query(
      "recall_search_history",
      accessToken,
      params,
      page,
      pageSize,
      signal,
    );
    return pageFromRows(result.rows, result.total, (row) => ({
      id: String(row.id ?? ""),
      book_id: asString(row.book_id),
      query: String(row.query ?? ""),
      answer: asString(row.answer),
      sources: (row.sources ?? []) as RecallRecord["sources"],
      created_at: asString(row.created_at),
    }));
  }

  async listInsights(
    userId: string,
    accessToken: string,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<PageResult<InsightRecord>> {
    const result = await this.query(
      "reading_insights_memory",
      accessToken,
      {
        select: "id,insight_content,insight_metadata,created_at,expires_at",
        user_id: `eq.${userId}`,
        order: "created_at.desc",
      },
      page,
      pageSize,
      signal,
    );
    return pageFromRows(result.rows, result.total, (row) => ({
      id: String(row.id ?? ""),
      insight_content: String(row.insight_content ?? ""),
      insight_metadata:
        (row.insight_metadata ?? {}) as InsightRecord["insight_metadata"],
      created_at: asString(row.created_at),
      expires_at: asString(row.expires_at),
    }));
  }

  async getEntitlement(
    userId: string,
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<EntitlementRecord> {
    const row = await this.single("users", accessToken, {
      select: "subscription_status,subscription_expires_at",
      id: `eq.${userId}`,
    }, signal);
    const status = asString(row.subscription_status);
    return {
      tier: status === "pro_monthly" || status === "pro_yearly"
        ? "pro"
        : "free",
      source: "bookgolas_account",
      entitlement_id: "byungskerslab/북골라스 Pro",
      usage_pool: "shared_bookgolas_account",
      expires_at: asString(row.subscription_expires_at),
      activation: "read_only_contract",
    };
  }
}
