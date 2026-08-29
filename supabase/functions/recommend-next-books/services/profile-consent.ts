import {
  executeThirdPartyAiOperation,
  type ThirdPartyAiOperationResult,
} from "../../_shared/third-party-ai-consent.ts";
import type { UserReadingProfile } from "../types.ts";
import type {
  AiBudgetContext,
  AiProviderOperation,
} from "../../_shared/ai-usage.ts";

type ProfileCollectorLike = {
  collect(
    userId: string,
    runProviderCall: <T>(
      input: string,
      context: AiBudgetContext,
      operation: AiProviderOperation<T>,
    ) => Promise<T>,
  ): Promise<UserReadingProfile>;
};

export function collectProfileWithConsent(
  authClient: unknown,
  userId: string,
  profileCollector: ProfileCollectorLike,
  runProviderCall: <T>(
    input: string,
    context: AiBudgetContext,
    operation: AiProviderOperation<T>,
  ) => Promise<T>,
): Promise<ThirdPartyAiOperationResult<UserReadingProfile>> {
  return executeThirdPartyAiOperation(
    authClient,
    userId,
    "open_ai",
    () => profileCollector.collect(userId, runProviderCall),
  );
}
