export const onboardingStorageKeys = {
  completed: "hasSeenOnboarding_v1",
  agePolicy: "age_policy_status",
} as const;

export const agePolicyStatuses = ["under14", "age14OrOlder"] as const;

export type AgePolicyStatus = (typeof agePolicyStatuses)[number];

export type OnboardingState =
  | { status: "complete"; agePolicy: AgePolicyStatus; recovered: false }
  | { status: "incomplete"; agePolicy: AgePolicyStatus | null; recovered: boolean };

function isAgePolicyStatus(value: string | null): value is AgePolicyStatus {
  return agePolicyStatuses.includes(value as AgePolicyStatus);
}

export function resetOnboardingState(storage: Storage): void {
  storage.removeItem(onboardingStorageKeys.completed);
  storage.removeItem(onboardingStorageKeys.agePolicy);
}

export function readOnboardingState(storage: Storage): OnboardingState {
  const completed = storage.getItem(onboardingStorageKeys.completed);
  const agePolicy = storage.getItem(onboardingStorageKeys.agePolicy);

  if (completed === "true" && isAgePolicyStatus(agePolicy)) {
    return { status: "complete", agePolicy, recovered: false };
  }

  const validIncomplete =
    (completed === null || completed === "false") &&
    (agePolicy === null || isAgePolicyStatus(agePolicy));
  if (validIncomplete) {
    return {
      status: "incomplete",
      agePolicy: isAgePolicyStatus(agePolicy) ? agePolicy : null,
      recovered: false,
    };
  }

  resetOnboardingState(storage);
  return { status: "incomplete", agePolicy: null, recovered: true };
}

export function completeOnboardingState(
  storage: Storage,
  agePolicy: AgePolicyStatus,
): boolean {
  try {
    storage.setItem(onboardingStorageKeys.agePolicy, agePolicy);
    storage.setItem(onboardingStorageKeys.completed, "true");
    return true;
  } catch {
    try {
      resetOnboardingState(storage);
    } catch {
      return false;
    }
    return false;
  }
}
