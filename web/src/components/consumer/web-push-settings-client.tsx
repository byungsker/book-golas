"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ConsumerButton,
  ConsumerCard,
  ConsumerEmptyState,
  ConsumerErrorState,
  ConsumerLoadingState,
} from "@/components/consumer/blab-primitives";
import type { ConsumerLocale } from "@/lib/consumer/paths";
import {
  getBrowserPushCapability,
  requestBrowserPushSubscription,
  unsubscribeBrowserPush,
  type BrowserPushCapability,
  type BrowserPushError,
} from "@/lib/consumer/web-push";
import {
  WebPushRegistrationResponseSchema,
  WebPushSettingsResponseSchema,
  WebPushSettingsUpdateRequestSchema,
  type NotificationSettings,
  type WebPushSettingsResponse,
} from "@/lib/product/contracts";

type SettingsState = "loading" | "ready" | "unsupported" | "permission-required" | "denied" | "error" | "consent" | "quota" | "offline";
type RequestError = Error & { code?: string };

function browserState(
  response: WebPushSettingsResponse,
  browserCapability: BrowserPushCapability,
): SettingsState {
  if (response.push.capability === "unsupported" || browserCapability === "unsupported") return "unsupported";
  if (response.push.capability === "denied" || browserCapability === "denied") return "denied";
  if (response.push.registered) return "ready";
  return "permission-required";
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function responseError(response: Response, payload: unknown): RequestError {
  const error = new Error("The notification request failed.") as RequestError;
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const value = (payload as { error?: unknown }).error;
    if (typeof value === "object" && value !== null && "code" in value && typeof (value as { code?: unknown }).code === "string") {
      error.code = (value as { code: string }).code;
    }
  }
  if (response.status === 401) error.code = "unauthorized";
  return error;
}

function errorState(error: RequestError): SettingsState {
  if (error.code === "consent_required") return "consent";
  if (error.code === "quota_exceeded") return "quota";
  if (error.code === "offline" || (typeof navigator !== "undefined" && !navigator.onLine)) return "offline";
  return "error";
}

function browserErrorState(error: BrowserPushError): SettingsState {
  if (error.code === "unsupported") return "unsupported";
  if (error.code === "permission-denied") return "denied";
  return "error";
}

function timeOptions() {
  return Array.from({ length: 48 }, (_, index) => ({ hour: Math.floor(index / 2), minute: index % 2 === 0 ? 0 : 30 }));
}

function timeValue(hour: number, minute: number): string {
  return `${hour}:${minute}`;
}

function parseTime(value: string): { hour: number; minute: 0 | 30 } {
  const [hour, minute] = value.split(":").map(Number);
  const normalizedMinute: 0 | 30 = minute === 30 ? 30 : 0;
  return { hour, minute: normalizedMinute };
}

export function WebPushSettingsClient({ locale }: { locale: ConsumerLocale }) {
  const t = useTranslations("consumer.notifications");
  const [state, setState] = useState<SettingsState>("loading");
  const [data, setData] = useState<WebPushSettingsResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [permissionPending, setPermissionPending] = useState(false);
  const options = useMemo(() => timeOptions(), []);

  const load = useCallback(async () => {
    setState("loading");
    setMessage(null);
    try {
      const response = await fetch(`/api/consumer/notifications?locale=${locale}`, { cache: "no-store", credentials: "same-origin" });
      const payload = await readJson(response);
      if (!response.ok) throw responseError(response, payload);
      const parsed = WebPushSettingsResponseSchema.safeParse(payload);
      if (!parsed.success) throw new Error("The notification settings response is malformed.");
      setData(parsed.data);
      setState(browserState(parsed.data, getBrowserPushCapability()));
    } catch (caught) {
      const error = caught instanceof Error ? caught as RequestError : new Error("The notification request failed.");
      setState(errorState(error));
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateSettings(patch: Partial<NotificationSettings>) {
    const parsed = WebPushSettingsUpdateRequestSchema.safeParse(patch);
    if (!parsed.success) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/consumer/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(parsed.data),
      });
      const payload = await readJson(response);
      if (!response.ok) throw responseError(response, payload);
      const next = WebPushSettingsResponseSchema.safeParse(payload);
      if (!next.success) throw new Error("The notification settings response is malformed.");
      setData(next.data);
      setState(browserState(next.data, getBrowserPushCapability()));
      setMessage(t("saved"));
    } catch (caught) {
      const error = caught instanceof Error ? caught as RequestError : new Error("The notification request failed.");
      setState(errorState(error));
    } finally {
      setSaving(false);
    }
  }

  async function enablePush() {
    setPermissionPending(true);
    setMessage(null);
    try {
      const subscription = await requestBrowserPushSubscription();
      const response = await fetch("/api/consumer/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ subscription, locale }),
      });
      const payload = await readJson(response);
      if (!response.ok) throw responseError(response, payload);
      const registered = WebPushRegistrationResponseSchema.safeParse(payload);
      if (!registered.success) {
        throw new Error("The Web Push registration response is malformed.");
      }
      await load();
      setMessage(t("enabled"));
    } catch (caught) {
      const error = caught instanceof Error ? caught : new Error("The Web Push subscription failed.");
      const code = "code" in error && typeof error.code === "string" ? error.code : undefined;
      setState(code ? browserErrorState(error as BrowserPushError) : errorState(error as RequestError));
    } finally {
      setPermissionPending(false);
    }
  }

  async function disablePush() {
    setPermissionPending(true);
    setMessage(null);
    try {
      await unsubscribeBrowserPush();
      const response = await fetch("/api/consumer/push", { method: "DELETE", credentials: "same-origin" });
      const payload = await readJson(response);
      if (!response.ok) throw responseError(response, payload);
      await load();
      setMessage(t("disabled"));
    } catch (caught) {
      const error = caught instanceof Error ? caught as RequestError : new Error("The Web Push subscription failed.");
      setState(errorState(error));
    } finally {
      setPermissionPending(false);
    }
  }

  if (state === "loading") {
    return <div data-testid="web-push-settings" data-push-state="loading"><ConsumerCard><ConsumerLoadingState label={t("loading")} /></ConsumerCard></div>;
  }

  if (!data) {
    const title = state === "offline" ? t("offlineTitle") : state === "consent" ? t("consentTitle") : state === "quota" ? t("quotaTitle") : t("errorTitle");
    const description = state === "offline" ? t("offlineDescription") : state === "consent" ? t("consentDescription") : state === "quota" ? t("quotaDescription") : t("errorDescription");
    return (
      <div data-testid="web-push-settings" data-push-state={state}>
        <ConsumerCard>
          <ConsumerErrorState title={title} message={description} />
          <div className="mt-5 flex justify-center"><ConsumerButton type="button" variant="secondary" text={t("retry")} onClick={() => void load()} data-testid="web-push-retry" /></div>
        </ConsumerCard>
      </div>
    );
  }

  const settings = data.settings;
  const registered = data.push.registered;
  const unsupported = state === "unsupported";
  const denied = state === "denied";
  return (
    <div className="grid gap-6" data-testid="web-push-settings" data-push-state={state} data-push-registered={String(registered)} data-push-delivery={data.push.delivery}>
      <ConsumerCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">{t("title")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("description")}</p>
          </div>
          <span className="rounded-full border border-[var(--blab-glass-border)] px-3 py-2 text-sm font-semibold" data-testid="web-push-status">
            {registered ? t("registered") : unsupported ? t("unsupported") : denied ? t("denied") : t("notRegistered")}
          </span>
        </div>
        {unsupported ? (
          <div className="mt-5 rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-glass-fill)] p-4" data-testid="web-push-unsupported"><h3 className="font-semibold">{t("unsupportedTitle")}</h3><p className="mt-2 text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("unsupportedDescription")}</p></div>
        ) : denied ? (
          <div className="mt-5 rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-glass-fill)] p-4" data-testid="web-push-denied"><h3 className="font-semibold">{t("deniedTitle")}</h3><p className="mt-2 text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("deniedDescription")}</p></div>
        ) : registered ? (
          <div className="mt-5 flex flex-wrap items-center gap-3"><ConsumerButton type="button" variant="secondary" text={permissionPending ? t("disabling") : t("disable")} loading={permissionPending} loadingLabel={t("disabling")} onClick={() => void disablePush()} data-testid="web-push-disable" /><p className="text-sm text-[var(--blab-text-tertiary)]" data-testid="web-push-delivery-note">{t("deliveryUnverified")}</p></div>
        ) : (
          <div className="mt-5"><ConsumerButton type="button" variant="primary" text={permissionPending ? t("enabling") : t("enable")} loading={permissionPending} loadingLabel={t("enabling")} onClick={() => void enablePush()} data-testid="web-push-enable" /><p className="mt-3 text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("permissionDescription")}</p></div>
        )}
      </ConsumerCard>

      <ConsumerCard>
        <h2 className="text-xl font-semibold">{t("settingsTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("settingsDescription")}</p>
        <div className="mt-5 grid gap-4" data-testid="web-push-preferences">
          <label className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-[var(--blab-glass-border)] px-4 py-3"><span className="font-semibold">{t("notificationEnabled")}</span><input type="checkbox" checked={settings.notificationEnabled} disabled={saving} onChange={(event) => void updateSettings({ notificationEnabled: event.target.checked })} data-testid="web-push-notification-enabled" /></label>
          <label className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-[var(--blab-glass-border)] px-4 py-3"><span className="font-semibold">{t("dailyReminder")}</span><input type="checkbox" checked={settings.dailyReminderEnabled} disabled={saving} onChange={(event) => void updateSettings({ dailyReminderEnabled: event.target.checked })} data-testid="web-push-daily-enabled" /></label>
          <label className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-[var(--blab-glass-border)] px-4 py-3"><span className="font-semibold">{t("goalAlarm")}</span><input type="checkbox" checked={settings.goalAlarmEnabled} disabled={saving} onChange={(event) => void updateSettings({ goalAlarmEnabled: event.target.checked })} data-testid="web-push-goal-enabled" /></label>
          <label className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-[var(--blab-glass-border)] px-4 py-3"><span className="font-semibold">{t("eventNudge")}</span><input type="checkbox" checked={settings.eventNudgeEnabled} disabled={saving} onChange={(event) => void updateSettings({ eventNudgeEnabled: event.target.checked })} data-testid="web-push-event-enabled" /></label>
          <label className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-[var(--blab-glass-border)] px-4 py-3"><span className="font-semibold">{t("announcements")}</span><input type="checkbox" checked={settings.announcementsEnabled} disabled={saving} onChange={(event) => void updateSettings({ announcementsEnabled: event.target.checked })} data-testid="web-push-announcements-enabled" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold"><span>{t("dailyReminderTime")}</span><select className="min-h-11 rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-glass-fill)] px-3" value={timeValue(settings.dailyReminderHour, settings.dailyReminderMinute)} disabled={saving} onChange={(event) => void updateSettings({ dailyReminderHour: parseTime(event.target.value).hour, dailyReminderMinute: parseTime(event.target.value).minute })} data-testid="web-push-daily-time">{options.map((option) => <option key={timeValue(option.hour, option.minute)} value={timeValue(option.hour, option.minute)}>{String(option.hour).padStart(2, "0")}:{String(option.minute).padStart(2, "0")}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-semibold"><span>{t("goalAlarmTime")}</span><select className="min-h-11 rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-glass-fill)] px-3" value={timeValue(settings.goalAlarmHour, settings.goalAlarmMinute)} disabled={saving} onChange={(event) => void updateSettings({ goalAlarmHour: parseTime(event.target.value).hour, goalAlarmMinute: parseTime(event.target.value).minute })} data-testid="web-push-goal-time">{options.map((option) => <option key={timeValue(option.hour, option.minute)} value={timeValue(option.hour, option.minute)}>{String(option.hour).padStart(2, "0")}:{String(option.minute).padStart(2, "0")}</option>)}</select></label>
          </div>
        </div>
        {message ? <p role="status" className="mt-4 text-sm text-[var(--blab-color-success)]" data-testid="web-push-saved">{message}</p> : null}
      </ConsumerCard>

      <ConsumerCard>
        <ConsumerEmptyState title={t("fallbackTitle")} message={t("fallbackDescription")} />
        <div className="mt-5 flex justify-center"><Link href={`/${locale}/account`} className="inline-flex min-h-11 items-center rounded-xl border border-[var(--blab-glass-border)] px-4 text-sm font-semibold underline-offset-4 hover:underline" data-testid="web-push-account-link">{t("accountBack")}</Link></div>
      </ConsumerCard>
    </div>
  );
}
