import {
  AccountAvatarResponseSchema,
  AccountSettingsResponseSchema,
  type AccountAvatarResponse,
  type AccountSettingsResponse,
} from "@/lib/product/contracts";
import {
  consentRequiredError,
  failure,
  offlineError,
  providerError,
  quotaExceededError,
  success,
  unauthorizedError,
  unavailableError,
  validationError,
  type ProductError,
  type ProductResult,
} from "@/lib/product/dal/errors";

export const accountSettingsFixtureUserId = "00000000-0000-4000-8000-000000000001";

const initialProfile = {
  id: accountSettingsFixtureUserId,
  email: "reader@example.com",
  nickname: "Reader",
  name: "Bookgolas Reader",
  avatarUrl: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  lastSignInAt: "2026-09-16T00:00:00.000Z",
} as const;

const profiles = new Map<string, AccountSettingsResponse>();

function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function baseResponse(): AccountSettingsResponse {
  return AccountSettingsResponseSchema.parse({
    state: "ready",
    profile: initialProfile,
    subscription: { enabled: false, status: "free" },
  });
}

function errorFor(fixture: string): ProductError | null {
  if (fixture === "account-settings-unauthorized") return unauthorizedError();
  if (fixture === "account-settings-consent") return consentRequiredError("Account settings consent is required.");
  if (fixture === "account-settings-quota") return quotaExceededError("Account settings quota is unavailable.");
  if (fixture === "account-settings-offline") return offlineError("Account settings are offline.");
  if (fixture === "account-settings-error" || fixture === "account-settings-network") {
    return unavailableError("Account settings are temporarily unavailable.");
  }
  return null;
}

function currentResponse(fixture: string): AccountSettingsResponse {
  const existing = profiles.get(fixture);
  if (existing) return copy(existing);
  if (fixture === "account-settings-empty") {
    const empty = AccountSettingsResponseSchema.parse({
      state: "empty",
      profile: null,
      subscription: { enabled: false, status: "disabled" },
    });
    profiles.set(fixture, empty);
    return copy(empty);
  }
  const ready = baseResponse();
  profiles.set(fixture, ready);
  return copy(ready);
}

export function getAccountSettingsFixture(
  fixture: string,
): ProductResult<AccountSettingsResponse> {
  if (fixture === "account-settings-password-failure") return success(currentResponse(fixture));
  const error = errorFor(fixture);
  return error ? failure(error) : success(currentResponse(fixture));
}

export function updateAccountSettingsFixture(
  fixture: string,
  nickname: string,
): ProductResult<AccountSettingsResponse> {
  const error = errorFor(fixture);
  if (error) return failure(error);
  if (fixture === "account-settings-foreign") {
    return failure(validationError("Ownership is derived from the authenticated session."));
  }
  const current = currentResponse(fixture);
  if (!current.profile) return failure(unavailableError("The account profile is unavailable."));
  const updated = AccountSettingsResponseSchema.parse({
    ...current,
    profile: { ...current.profile, nickname: nickname.trim() },
  });
  profiles.set(fixture, updated);
  return success(copy(updated));
}

export function uploadAccountSettingsAvatarFixture(
  fixture: string,
  contentType: string,
): ProductResult<AccountAvatarResponse> {
  const error = errorFor(fixture);
  if (error) return failure(error);
  if (fixture === "account-settings-avatar-failure") {
    return failure(providerError("The avatar could not be uploaded."));
  }
  const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const path = `${accountSettingsFixtureUserId}/avatar.${extension}`;
  const avatarUrl = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2296%22%20height%3D%2296%22%3E%3Crect%20width%3D%2296%22%20height%3D%2296%22%20fill%3D%22%236473ff%22%2F%3E%3C%2Fsvg%3E";
  const current = currentResponse(fixture);
  if (current.profile) {
    profiles.set(fixture, AccountSettingsResponseSchema.parse({
      ...current,
      profile: { ...current.profile, avatarUrl },
    }));
  }
  return success(AccountAvatarResponseSchema.parse({ kind: "avatar_updated", path, avatarUrl }));
}

export function resetAccountSettingsFixtures(): void {
  profiles.clear();
}
