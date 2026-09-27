import {
  clearBrowserTimerState,
} from "@/lib/consumer/timer-state";
import {
  deleteAccountConfirmationValues,
} from "@/lib/product/contracts";

type DeletionStorage = Pick<Storage, "length" | "key" | "getItem" | "setItem" | "removeItem">;

function isProductStorageKey(key: string): boolean {
  return key.startsWith("bookgolas.") || key.startsWith("sb-");
}

export function isAccountDeletionConfirmationValid(value: string, expected: string): boolean {
  const normalizedValue = value.trim();
  const normalizedExpected = expected.trim();
  return normalizedValue === normalizedExpected && deleteAccountConfirmationValues.includes(
    normalizedExpected as (typeof deleteAccountConfirmationValues)[number],
  );
}

export function clearAccountDeletionClientState(
  storage?: DeletionStorage,
  session?: Pick<Storage, "clear">,
): void {
  const localStorage = storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (localStorage) {
    const keys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && isProductStorageKey(key)) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
    clearBrowserTimerState(localStorage);
  }

  const sessionStorage = session ?? (typeof window === "undefined" ? null : window.sessionStorage);
  try {
    sessionStorage?.clear();
  } catch {
    return;
  }

  if (typeof window !== "undefined") window.dispatchEvent(new Event("bookgolas:logout"));
}
