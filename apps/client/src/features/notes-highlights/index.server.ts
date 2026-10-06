import "server-only";

export * from "./api/notes-highlights-contracts";

export {
  createOwnedConsumerRecord,
  deleteOwnedConsumerRecord,
  listOwnedConsumerRecords,
  retryOwnedConsumerRecordIndex,
  updateOwnedConsumerRecord,
} from "./api/index.server";
export {
  applyNotesHighlightsFixtureMutation,
  fixtureUserId,
  getNotesHighlightsFixtureRecords,
} from "./model/notes-highlights-fixtures";
