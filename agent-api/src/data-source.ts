import type {
  BookRecord,
  EntitlementRecord,
  InsightRecord,
  PageResult,
  ProgressRecord,
  RecallRecord,
} from "./contracts.ts";

export interface AgentReadDataSource {
  searchBooks(
    userId: string,
    accessToken: string,
    query: string,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<PageResult<BookRecord>>;
  listLibrary(
    userId: string,
    accessToken: string,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<PageResult<BookRecord>>;
  listProgress(
    userId: string,
    accessToken: string,
    bookId: string | null,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<PageResult<ProgressRecord>>;
  listRecall(
    userId: string,
    accessToken: string,
    bookId: string | null,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<PageResult<RecallRecord>>;
  listInsights(
    userId: string,
    accessToken: string,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<PageResult<InsightRecord>>;
  getEntitlement(
    userId: string,
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<EntitlementRecord>;
}

export class DataSourceError extends Error {
  readonly status: number;
  readonly retryable: boolean;

  constructor(message: string, status: number, retryable: boolean) {
    super(message);
    this.name = "DataSourceError";
    this.status = status;
    this.retryable = retryable;
  }
}
