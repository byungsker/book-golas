import "server-only";

export * from "./api/ai-artifacts-contracts";
export {
  readAiArtifact,
  type AiArtifactRead,
} from "./api/index.server";
export {
  aiArtifactsFixtureBookId,
  getAiArtifactsFixtureGenerate,
  getAiArtifactsFixtureProviderCalls,
  getAiArtifactsFixtureRead,
  resetAiArtifactsFixtures,
} from "./model/ai-artifacts-fixtures";
