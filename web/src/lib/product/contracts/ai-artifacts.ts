import { z } from "zod";
import {
  BookIdSchema,
  IsoDateSchema,
  LocaleSchema,
  RecordIdSchema,
  RequestIdSchema,
} from "./common";
import { InsightSchema, RecommendationResultSchema } from "./ai";

export const aiArtifactKindValues = ["mindmap", "insights", "recommendations"] as const;
export const AiArtifactKindSchema = z.enum(aiArtifactKindValues);
export type AiArtifactKind = z.infer<typeof AiArtifactKindSchema>;

export const aiArtifactCacheStateValues = ["fresh", "missing", "expired"] as const;
export const AiArtifactCacheStateSchema = z.enum(aiArtifactCacheStateValues);
export type AiArtifactCacheState = z.infer<typeof AiArtifactCacheStateSchema>;

export const aiArtifactUiStateValues = [
  "idle",
  "loading",
  "fresh",
  "generating",
  "success",
  "missing",
  "expired",
  "empty",
  "unauthorized",
  "consent_required",
  "insufficient_data",
  "rate_limit_exceeded",
  "quota_exceeded",
  "provider_timeout",
  "provider_error",
  "configuration_error",
  "offline",
  "error",
] as const;
export const AiArtifactUiStateSchema = z.enum(aiArtifactUiStateValues);
export type AiArtifactUiState = z.infer<typeof AiArtifactUiStateSchema>;

const NoteNodeSchema = z
  .object({
    id: z.string().trim().min(1).max(200),
    type: z.enum(["highlight", "note", "photo_ocr"]),
    content: z.string(),
    pageNumber: z.number().int().min(1).optional(),
    sourceId: RecordIdSchema.optional(),
  })
  .strict();

const NoteClusterSchema = z
  .object({
    id: z.string().trim().min(1).max(200),
    name: z.string().trim().min(1).max(500),
    summary: z.string(),
    nodes: z.array(NoteNodeSchema),
  })
  .strict();

const NoteConnectionSchema = z
  .object({
    fromNodeId: z.string().trim().min(1).max(200),
    toNodeId: z.string().trim().min(1).max(200),
    reason: z.string(),
  })
  .strict();

export const AiMindMapSchema = z
  .object({
    bookId: BookIdSchema,
    generatedAt: IsoDateSchema,
    clusters: z.array(NoteClusterSchema),
    connections: z.array(NoteConnectionSchema),
  })
  .strict();
export type AiMindMap = z.infer<typeof AiMindMapSchema>;

export const AiInsightsSchema = z.array(InsightSchema);
export type AiInsights = z.infer<typeof AiInsightsSchema>;

export const AiRecommendationsSchema = RecommendationResultSchema;
export type AiRecommendations = z.infer<typeof AiRecommendationsSchema>;

const MindMapRequestFields = {
  kind: z.literal("mindmap"),
  bookId: BookIdSchema,
  locale: LocaleSchema,
} as const;

const InsightsRequestFields = {
  kind: z.literal("insights"),
  locale: LocaleSchema,
} as const;

const RecommendationsRequestFields = {
  kind: z.literal("recommendations"),
  locale: LocaleSchema,
} as const;

export const AiArtifactReadRequestSchema = z.discriminatedUnion("kind", [
  z.object(MindMapRequestFields).strict(),
  z.object(InsightsRequestFields).strict(),
  z.object(RecommendationsRequestFields).strict(),
]);
export type AiArtifactReadRequest = z.infer<typeof AiArtifactReadRequestSchema>;

export const AiArtifactGenerateRequestSchema = z.discriminatedUnion("kind", [
  z.object({ ...MindMapRequestFields, requestKey: RequestIdSchema }).strict(),
  z.object({ ...InsightsRequestFields, requestKey: RequestIdSchema }).strict(),
  z.object({ ...RecommendationsRequestFields, requestKey: RequestIdSchema }).strict(),
]);
export type AiArtifactGenerateRequest = z.infer<typeof AiArtifactGenerateRequestSchema>;

const AiArtifactReadBase = {
  cacheState: AiArtifactCacheStateSchema,
  createdAt: IsoDateSchema.nullable(),
} as const;

export const AiMindMapReadResponseSchema = z
  .object({
    kind: z.literal("mindmap"),
    ...AiArtifactReadBase,
    artifact: AiMindMapSchema.nullable(),
  })
  .strict();

export const AiInsightsReadResponseSchema = z
  .object({
    kind: z.literal("insights"),
    ...AiArtifactReadBase,
    artifact: AiInsightsSchema.nullable(),
  })
  .strict();

export const AiRecommendationsReadResponseSchema = z
  .object({
    kind: z.literal("recommendations"),
    ...AiArtifactReadBase,
    artifact: AiRecommendationsSchema.nullable(),
  })
  .strict();

export const AiArtifactReadResponseSchema = z.discriminatedUnion("kind", [
  AiMindMapReadResponseSchema,
  AiInsightsReadResponseSchema,
  AiRecommendationsReadResponseSchema,
]);
export type AiArtifactReadResponse = z.infer<typeof AiArtifactReadResponseSchema>;

const AiArtifactGeneratedBase = {
  requestKey: RequestIdSchema,
  cacheState: z.enum(["fresh", "missing", "expired"]),
} as const;

export const AiMindMapGeneratedResponseSchema = z
  .object({
    kind: z.literal("mindmap"),
    ...AiArtifactGeneratedBase,
    artifact: AiMindMapSchema,
  })
  .strict();

export const AiInsightsGeneratedResponseSchema = z
  .object({
    kind: z.literal("insights"),
    ...AiArtifactGeneratedBase,
    artifact: AiInsightsSchema,
  })
  .strict();

export const AiRecommendationsGeneratedResponseSchema = z
  .object({
    kind: z.literal("recommendations"),
    ...AiArtifactGeneratedBase,
    artifact: AiRecommendationsSchema,
  })
  .strict();

export const AiArtifactGeneratedResponseSchema = z.discriminatedUnion("kind", [
  AiMindMapGeneratedResponseSchema,
  AiInsightsGeneratedResponseSchema,
  AiRecommendationsGeneratedResponseSchema,
]);
export type AiArtifactGeneratedResponse = z.infer<typeof AiArtifactGeneratedResponseSchema>;

export const AiArtifactResponseSchema = z.union([
  AiArtifactReadResponseSchema,
  AiArtifactGeneratedResponseSchema,
]);
export type AiArtifactResponse = z.infer<typeof AiArtifactResponseSchema>;

