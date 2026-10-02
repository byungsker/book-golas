import "server-only";

export * from "./api/ai-consent-contracts";
export { getAiConsentDisclosure } from "./model/disclosures";
export {
  AI_CONSENT_FIXTURE_USER_ID,
  aiConsentMutationFixtureError,
  applyAiConsentFixtureMutation,
  getAiConsentFixture,
  resetAiConsentFixtures,
} from "./model/fixtures";
