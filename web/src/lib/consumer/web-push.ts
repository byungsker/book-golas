import {
  WebPushSubscriptionSchema,
  type WebPushSubscription,
} from "@/lib/product/contracts";

export type BrowserPushCapability = "unsupported" | "permission-required" | "denied" | "granted";

export type BrowserPushError = Error & { code?: "unsupported" | "permission-denied" | "registration-failed" | "invalid-subscription" };

function pushError(message: string, code: BrowserPushError["code"]): BrowserPushError {
  const error = new Error(message) as BrowserPushError;
  error.code = code;
  return error;
}

export function getBrowserPushCapability(): BrowserPushCapability {
  if (
    typeof window === "undefined" ||
    !window.isSecureContext ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return "unsupported";
  }

  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "granted") return "granted";
  return "permission-required";
}

export function parseBrowserPushSubscription(value: unknown): WebPushSubscription {
  const parsed = WebPushSubscriptionSchema.safeParse(value);
  if (!parsed.success) throw pushError("The browser returned an invalid Web Push subscription.", "invalid-subscription");
  return parsed.data;
}

export async function requestBrowserPushSubscription(): Promise<WebPushSubscription> {
  const capability = getBrowserPushCapability();
  if (capability === "unsupported") throw pushError("This browser cannot receive Web Push notifications.", "unsupported");
  if (capability === "denied") throw pushError("Notification permission is denied in this browser.", "permission-denied");

  let permission = Notification.permission;
  if (permission !== "granted") permission = await Notification.requestPermission();
  if (permission !== "granted") throw pushError("Notification permission was not granted.", "permission-denied");

  try {
    const registration = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true });
    return parseBrowserPushSubscription(subscription.toJSON());
  } catch (error) {
    if ((error as BrowserPushError).code === "invalid-subscription") throw error;
    throw pushError("The browser push subscription could not be created.", "registration-failed");
  }
}

export async function unsubscribeBrowserPush(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) await subscription.unsubscribe();
}
