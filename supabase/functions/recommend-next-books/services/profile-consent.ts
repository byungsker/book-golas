import {
  executeThirdPartyAiOperation,
  type ThirdPartyAiOperationResult,
} from "../../_shared/third-party-ai-consent.ts";
import type { UserReadingProfile } from "../types.ts";

type ProfileCollectorLike = {
  collect(
    userId: string,
    beforeProviderCall: (
      input: string,
    ) => Promise<() => Promise<void>>,
  ): Promise<UserReadingProfile>;
};

export function collectProfileWithConsent(
  authClient: unknown,
  userId: string,
  profileCollector: ProfileCollectorLike,
  beforeProviderCall: (
    input: string,
  ) => Promise<() => Promise<void>>,
): Promise<ThirdPartyAiOperationResult<UserReadingProfile>> {
  return executeThirdPartyAiOperation(
    authClient,
    userId,
    "open_ai",
    () => profileCollector.collect(userId, beforeProviderCall),
  );
}
