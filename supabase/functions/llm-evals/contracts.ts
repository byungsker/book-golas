export const EVALUATION_CONTRACT_VERSION = "llm-eval-v1";
export const EVALUATION_FIXTURE_VERSION = "llm-fixtures-v1";
export const EVALUATION_RUNNER_VERSION = "llm-eval-runner-v1";

export type EvaluationSurface =
  | "recall-search.embedding"
  | "recall-search.answer"
  | "structure-notes.classification"
  | "structure-notes.summary"
  | "structure-notes.connection"
  | "recommend-next-books.recommendation"
  | "extract-keywords.chat"
  | "generate-embedding.embedding";

export interface SourceFileContract {
  path: string;
  markers: readonly string[];
}

export interface SurfaceContract {
  id: EvaluationSurface;
  functionName: string;
  provider: "openai";
  model: string;
  promptId: string;
  inputSchema: string;
  outputSchema: string;
  sourceFiles: readonly SourceFileContract[];
}

export type JsonRecord = Record<string, unknown>;

export interface EvaluationCase {
  id: string;
  surface: EvaluationSurface;
  weight: number;
  minimumScore: number;
  maxRegression: number;
  input: JsonRecord;
  expected: JsonRecord;
  baseline: JsonRecord;
}

export type CandidateResults = Record<string, JsonRecord>;
export type CandidateSource = "synthetic" | "external-file";

export interface SourceReceipt {
  surface: EvaluationSurface;
  path: string;
  sha256: string | null;
  markersExpected: number;
  markersFound: number;
  status: "pass" | "fail";
}

export interface ContractReceipt {
  id: EvaluationSurface;
  functionName: string;
  provider: "openai";
  model: string;
  promptId: string;
  inputSchema: string;
  outputSchema: string;
  sourceFiles: SourceReceipt[];
}

export interface EvaluationComponent {
  name: string;
  score: number;
  weight: number;
}

export interface CaseResult {
  id: string;
  surface: EvaluationSurface;
  score: number;
  baselineScore: number;
  minimumScore: number;
  maxRegression: number;
  regression: number;
  regressionExceeded: boolean;
  components: EvaluationComponent[];
  metrics: Record<string, number>;
  failureCodes: string[];
}

export interface EvaluationReport {
  schemaVersion: typeof EVALUATION_CONTRACT_VERSION;
  run: {
    environment: "synthetic";
    sourceCommit: string;
    fixtureVersion: typeof EVALUATION_FIXTURE_VERSION;
    runnerVersion: typeof EVALUATION_RUNNER_VERSION;
    fixtureSha256: string;
    candidateSource: CandidateSource;
    providerCalls: 0;
    liveProviderCalls: false;
  };
  contracts: ContractReceipt[];
  cases: CaseResult[];
  summary: {
    totalCases: number;
    passedCases: number;
    failedCases: number;
    weightedScore: number;
    baselineWeightedScore: number;
    overallRegression: number;
    minimumOverallScore: number;
    maxOverallRegression: number;
    sourceContractPassed: boolean;
    promotionGate: "pass" | "block";
    failureClasses: string[];
  };
  reportSha256: string;
}

export const LLM_SURFACE_CONTRACTS: readonly SurfaceContract[] = [
  {
    id: "recall-search.embedding",
    functionName: "recall-search",
    provider: "openai",
    model: "text-embedding-3-small",
    promptId: "recall-embedding-v1",
    inputSchema: "text",
    outputSchema: "embedding-vector-v1",
    sourceFiles: [
      {
        path: "supabase/functions/recall-search/index.ts",
        markers: [
          "async function generateEmbedding(text: string): Promise<number[]>",
          "https://api.openai.com/v1/embeddings",
          'model: "text-embedding-3-small"',
        ],
      },
    ],
  },
  {
    id: "recall-search.answer",
    functionName: "recall-search",
    provider: "openai",
    model: "gpt-4o-mini",
    promptId: "recall-answer-v1",
    inputSchema: "query-and-retrieved-context",
    outputSchema: "recall-answer-v1",
    sourceFiles: [
      {
        path: "supabase/functions/recall-search/index.ts",
        markers: [
          "async function generateAnswer(",
          "https://api.openai.com/v1/chat/completions",
          'model: "gpt-4o-mini"',
          "max_tokens: 1000",
        ],
      },
    ],
  },
  {
    id: "structure-notes.classification",
    functionName: "structure-notes",
    provider: "openai",
    model: "gpt-4o-mini",
    promptId: "structure-classification-v1",
    inputSchema: "provider-content-list",
    outputSchema: "classification-result-v1",
    sourceFiles: [
      {
        path: "supabase/functions/structure-notes/services/chain-service.ts",
        markers: [
          'modelName: "gpt-4o-mini"',
          "private async runClassification(",
          "classificationPrompt.format({ contents })",
        ],
      },
      {
        path: "supabase/functions/structure-notes/prompts/classification.ts",
        markers: ["export const classificationPrompt", "JSON만 출력"],
      },
    ],
  },
  {
    id: "structure-notes.summary",
    functionName: "structure-notes",
    provider: "openai",
    model: "gpt-4o-mini",
    promptId: "structure-summary-v1",
    inputSchema: "clustered-content",
    outputSchema: "summary-result-v1",
    sourceFiles: [
      {
        path: "supabase/functions/structure-notes/services/chain-service.ts",
        markers: [
          'modelName: "gpt-4o-mini"',
          "private async runSummary(",
          "summaryPrompt.format({ clusteredContents })",
        ],
      },
      {
        path: "supabase/functions/structure-notes/prompts/summary.ts",
        markers: ["export const summaryPrompt", "JSON만 출력"],
      },
    ],
  },
  {
    id: "structure-notes.connection",
    functionName: "structure-notes",
    provider: "openai",
    model: "gpt-4o-mini",
    promptId: "structure-connection-v1",
    inputSchema: "summarized-clusters",
    outputSchema: "connection-result-v1",
    sourceFiles: [
      {
        path: "supabase/functions/structure-notes/services/chain-service.ts",
        markers: [
          'modelName: "gpt-4o-mini"',
          "private async runConnection(",
          "connectionPrompt.format({",
        ],
      },
      {
        path: "supabase/functions/structure-notes/prompts/connection.ts",
        markers: ["export const connectionPrompt", "JSON만 출력"],
      },
    ],
  },
  {
    id: "recommend-next-books.recommendation",
    functionName: "recommend-next-books",
    provider: "openai",
    model: "gpt-4o-mini",
    promptId: "recommendation-v1",
    inputSchema: "user-reading-profile",
    outputSchema: "recommendation-list-v1",
    sourceFiles: [
      {
        path: "supabase/functions/recommend-next-books/config.ts",
        markers: ['model: "gpt-4o-mini"'],
      },
      {
        path:
          "supabase/functions/recommend-next-books/services/recommendation-service.ts",
        markers: [
          "PROMPT_KO",
          "PROMPT_EN",
          "async generate(profile: UserReadingProfile): Promise<Recommendation[]>",
          "this.promptTemplate.format({",
          "parseResponse",
        ],
      },
    ],
  },
  {
    id: "extract-keywords.chat",
    functionName: "extract-keywords",
    provider: "openai",
    model: "gpt-4o-mini",
    promptId: "keywords-v1",
    inputSchema: "reading-content-list",
    outputSchema: "keyword-list-v1",
    sourceFiles: [
      {
        path: "supabase/functions/extract-keywords/index.ts",
        markers: [
          "async function extractKeywordsWithGPT(texts: string[]): Promise<string[]>",
          "https://api.openai.com/v1/chat/completions",
          'model: "gpt-4o-mini"',
          "JSON 배열 형식으로만 응답",
        ],
      },
    ],
  },
  {
    id: "generate-embedding.embedding",
    functionName: "generate-embedding",
    provider: "openai",
    model: "text-embedding-3-small",
    promptId: "embedding-v1",
    inputSchema: "authenticated-content-record",
    outputSchema: "embedding-vector-v1",
    sourceFiles: [
      {
        path: "supabase/functions/generate-embedding/index.ts",
        markers: [
          "async function generateEmbedding(text: string): Promise<number[]>",
          "https://api.openai.com/v1/embeddings",
          'model: "text-embedding-3-small"',
        ],
      },
      {
        path: "supabase/functions/generate-embedding/usage-log.ts",
        markers: ["EMBEDDING_PROMPT_VERSION", '"embedding-v1"'],
      },
    ],
  },
];
