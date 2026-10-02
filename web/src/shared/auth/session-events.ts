import { readingTimerStorageKey } from "@/shared/config";

export const browserLogoutEvent = "bookgolas:logout";

export function broadcastBrowserLogout(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(readingTimerStorageKey);
  } catch {
    window.dispatchEvent(new Event(browserLogoutEvent));
    return;
  }
  window.dispatchEvent(new Event(browserLogoutEvent));
}
