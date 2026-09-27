import {
  DeleteAccountResultSchema,
  type DeleteAccountResult,
} from "@/lib/product/contracts";
import {
  failure,
  offlineError,
  quotaExceededError,
  success,
  unauthorizedError,
  unavailableError,
  type ProductResult,
} from "@/lib/product/dal/errors";

const fixtureAcceptedAt = "2026-09-16T00:00:00.000Z";
const completedFixtures = new Set<string>();

function completedResult(status: DeleteAccountResult["status"]): ProductResult<DeleteAccountResult> {
  return success(DeleteAccountResultSchema.parse({ status, acceptedAt: fixtureAcceptedAt }));
}

export function deleteAccountFixture(fixture: string): ProductResult<DeleteAccountResult> {
  if (fixture === "account-deletion-unauthorized") return failure(unauthorizedError());
  if (fixture === "account-deletion-offline") return failure(offlineError("Account deletion is offline."));
  if (fixture === "account-deletion-quota") return failure(quotaExceededError("Account deletion is temporarily limited."));
  if (fixture === "account-deletion-consent") return failure(unavailableError("Account deletion consent is unavailable."));
  if (fixture === "account-deletion-error") return failure(unavailableError("Account deletion is temporarily unavailable."));
  if (completedFixtures.has(fixture)) return completedResult("already_deleted");
  completedFixtures.add(fixture);
  return completedResult("completed");
}

export function resetAccountDeletionFixtures(): void {
  completedFixtures.clear();
}
