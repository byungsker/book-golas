export const API_VERSION = "v1";
export const CONTRACT_VERSION = "0.1.0";
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const CAPABILITY_CATALOG = [
  {
    id: "books.search",
    method: "GET",
    path: "/v1/books/search",
    access: "authenticated_user",
    side_effect: "none",
    cost_units: 1,
  },
  {
    id: "library.list",
    method: "GET",
    path: "/v1/library",
    access: "authenticated_user",
    side_effect: "none",
    cost_units: 1,
  },
  {
    id: "reading_progress.list",
    method: "GET",
    path: "/v1/reading-progress",
    access: "authenticated_user",
    side_effect: "none",
    cost_units: 1,
  },
  {
    id: "recall.history",
    method: "GET",
    path: "/v1/recall",
    access: "authenticated_user",
    side_effect: "none",
    cost_units: 1,
  },
  {
    id: "reading_insights.list",
    method: "GET",
    path: "/v1/insights",
    access: "authenticated_user",
    side_effect: "none",
    cost_units: 1,
  },
  {
    id: "account.entitlement",
    method: "GET",
    path: "/v1/entitlement",
    access: "authenticated_user",
    side_effect: "none",
    cost_units: 1,
  },
] as const;

export type CapabilityId = (typeof CAPABILITY_CATALOG)[number]["id"];

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface Pagination {
  page: number;
  page_size: number;
  has_more: boolean;
  total: number | null;
}

export interface UsageMetadata {
  capability: CapabilityId;
  units: number;
  attribution: "authenticated_user";
  ledger: "shared_bookgolas_account";
  provider_cost_incurred: false;
}

export interface ResponseMeta {
  api_version: typeof API_VERSION;
  contract_version: typeof CONTRACT_VERSION;
  request_id: string;
  generated_at: string;
  pagination?: Pagination;
  usage: UsageMetadata;
}

export interface AgentResponse<T> {
  data: T;
  meta: ResponseMeta;
}

export interface CapabilityResponse {
  data: CapabilityManifest;
  meta: {
    api_version: typeof API_VERSION;
    contract_version: typeof CONTRACT_VERSION;
    request_id: string;
    generated_at: string;
  };
}

export interface AgentErrorBody {
  error: {
    code: string;
    message: string;
    request_id: string;
    retryable: boolean;
    details?: Record<string, JsonValue>;
  };
}

export interface PageResult<T> {
  items: T[];
  total: number | null;
}

export interface BookRecord {
  id: string;
  title: string;
  author: string | null;
  status: string | null;
  current_page: number;
  total_pages: number;
  updated_at: string | null;
}

export interface ProgressRecord {
  id: string;
  book_id: string;
  page: number;
  previous_page: number;
  progress_type: string | null;
  reading_time: number;
  memo: string | null;
  created_at: string | null;
}

export interface RecallRecord {
  id: string;
  book_id: string | null;
  query: string;
  answer: string | null;
  sources: JsonValue;
  created_at: string | null;
}

export interface InsightRecord {
  id: string;
  insight_content: string;
  insight_metadata: JsonValue;
  created_at: string | null;
  expires_at: string | null;
}

export interface EntitlementRecord {
  tier: "free" | "pro";
  source: "bookgolas_account";
  entitlement_id: "byungskerslab/북골라스 Pro";
  usage_pool: "shared_bookgolas_account";
  expires_at: string | null;
  activation: "read_only_contract";
}

export interface CapabilityManifest {
  api_version: typeof API_VERSION;
  contract_version: typeof CONTRACT_VERSION;
  name: "bookgolas-agent-api";
  mode: "read_only";
  capabilities: typeof CAPABILITY_CATALOG;
  writes: {
    enabled: false;
    approval_required: true;
    dry_run_required: true;
    idempotency_required: true;
    postcondition_evidence_required: true;
  };
}
