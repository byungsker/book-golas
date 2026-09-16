"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  AccountAvatarResponseSchema,
  AccountProfileUpdateRequestSchema,
  AccountSettingsResponseSchema,
  type AccountSettingsResponse,
} from "@/lib/product/contracts";
import {
  ConsumerButton,
  ConsumerCard,
  ConsumerEmptyState,
  ConsumerErrorState,
  ConsumerLoadingState,
  ConsumerTextField,
} from "@/components/consumer/blab-primitives";
import { SignOutButton } from "@/components/consumer/sign-out-button";
import { getPasswordValidationError, getNicknameValidationError } from "@/lib/consumer/auth";
import type { ConsumerLocale } from "@/lib/consumer/paths";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AccountClientState = "loading" | "ready" | "empty" | "error" | "unauthorized" | "consent" | "quota" | "offline";
type ThemeChoice = "system" | "light" | "dark";

type RequestError = Error & { code?: string };

function errorFromResponse(status: number, value: unknown): RequestError {
  const error = new Error("The account settings request failed.") as RequestError;
  if (typeof value === "object" && value !== null && "error" in value) {
    const payload = (value as { error?: unknown }).error;
    if (typeof payload === "object" && payload !== null && "code" in payload) {
      const code = (payload as { code?: unknown }).code;
      if (typeof code === "string") error.code = code;
    }
  }
  if (status === 401) error.code = "unauthorized";
  return error;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function fixtureFromCookie(): string | null {
  const value = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("bookgolas-route-fixture="));
  return value ? decodeURIComponent(value.slice("bookgolas-route-fixture=".length)) : null;
}

function themeFromDocument(): ThemeChoice {
  const value = document.documentElement.dataset.blabTheme;
  return value === "light" || value === "dark" ? value : "system";
}

function applyTheme(theme: ThemeChoice): void {
  if (theme === "system") {
    const light = window.matchMedia("(prefers-color-scheme: light)").matches;
    document.documentElement.dataset.blabTheme = light ? "light" : "dark";
    return;
  }
  document.documentElement.dataset.blabTheme = theme;
}

function requestErrorState(error: RequestError): AccountClientState {
  if (error.code === "unauthorized") return "unauthorized";
  if (error.code === "consent_required") return "consent";
  if (error.code === "quota_exceeded") return "quota";
  if (error.code === "offline" || typeof navigator !== "undefined" && !navigator.onLine) return "offline";
  return "error";
}

export function AccountSettingsClient({ locale }: { locale: ConsumerLocale }) {
  const t = useTranslations("consumer.accountSettings");
  const router = useRouter();
  const [state, setState] = useState<AccountClientState>("loading");
  const [data, setData] = useState<AccountSettingsResponse | null>(null);
  const [nickname, setNickname] = useState("");
  const [nicknameError, setNicknameError] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [avatarSaved, setAvatarSaved] = useState(false);
  const [theme, setTheme] = useState<ThemeChoice>("system");
  const [languageToConfirm, setLanguageToConfirm] = useState<ConsumerLocale | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch(`/api/consumer/account?locale=${locale}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = await readJson(response);
      if (!response.ok) throw errorFromResponse(response.status, payload);
      const parsed = AccountSettingsResponseSchema.safeParse(payload);
      if (!parsed.success) throw new Error("The account settings response is malformed.");
      setData(parsed.data);
      setNickname(parsed.data.profile?.nickname ?? "");
      setState(parsed.data.state === "empty" ? "empty" : "ready");
    } catch (caught) {
      const error = caught instanceof Error ? caught as RequestError : new Error("The account settings request failed.");
      setState(requestErrorState(error));
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const stored = window.localStorage.getItem("bookgolas.theme");
    const nextTheme: ThemeChoice = stored === "light" || stored === "dark" || stored === "system"
      ? stored
      : themeFromDocument();
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  function chooseAvatar(file: File | undefined) {
    if (!file) return;
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) || file.size > 2 * 1024 * 1024) {
      setAvatarError(true);
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }
    setAvatarError(false);
    setAvatarSaved(false);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaved(false);
    setNicknameError(getNicknameValidationError(nickname) !== null);
    if (getNicknameValidationError(nickname)) return;
    setSavingProfile(true);
    try {
      const body = AccountProfileUpdateRequestSchema.parse({ nickname });
      const response = await fetch("/api/consumer/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const payload = await readJson(response);
      if (!response.ok) throw errorFromResponse(response.status, payload);
      const parsed = AccountSettingsResponseSchema.safeParse(payload);
      if (!parsed.success) throw new Error("The account settings response is malformed.");
      setData(parsed.data);
      setNickname(parsed.data.profile?.nickname ?? nickname.trim());
      setProfileSaved(true);
    } catch (caught) {
      const error = caught instanceof Error ? caught as RequestError : new Error("The account settings request failed.");
      setState(requestErrorState(error));
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveAvatar() {
    if (!avatarFile) return;
    setSavingAvatar(true);
    setAvatarSaved(false);
    setAvatarError(false);
    try {
      const form = new FormData();
      form.set("avatar", avatarFile);
      const response = await fetch("/api/consumer/account/avatar", {
        method: "POST",
        credentials: "same-origin",
        body: form,
      });
      const payload = await readJson(response);
      if (!response.ok) throw errorFromResponse(response.status, payload);
      const parsed = AccountAvatarResponseSchema.safeParse(payload);
      if (!parsed.success) throw new Error("The avatar response is malformed.");
      setData((current) => current?.profile
        ? { ...current, profile: { ...current.profile, avatarUrl: parsed.data.avatarUrl } }
        : current);
      setAvatarFile(null);
      setAvatarPreview(null);
      setAvatarSaved(true);
    } catch {
      setAvatarError(true);
    } finally {
      setSavingAvatar(false);
    }
  }

  function selectTheme(nextTheme: ThemeChoice) {
    setTheme(nextTheme);
    window.localStorage.setItem("bookgolas.theme", nextTheme);
    applyTheme(nextTheme);
    window.dispatchEvent(new CustomEvent("bookgolas-theme-change", { detail: nextTheme }));
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    if (!currentPassword.trim()) {
      setPasswordError(t("passwordCurrentRequired"));
      return;
    }
    const validation = getPasswordValidationError("reset-password", true, newPassword, confirmPassword);
    if (validation === "short") {
      setPasswordError(t("passwordMin"));
      return;
    }
    if (validation === "mismatch") {
      setPasswordError(t("passwordMismatch"));
      return;
    }

    setSavingPassword(true);
    try {
      const fixture = fixtureFromCookie();
      if (fixture === "account-settings-password-failure") {
        throw new Error(t("passwordError"));
      }
      if (!fixture?.startsWith("account-settings-")) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      }
      setPasswordSaved(true);
      setPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError(t("passwordError"));
    } finally {
      setSavingPassword(false);
    }
  }

  function confirmLanguage() {
    if (!languageToConfirm) return;
    router.push(`/${languageToConfirm}/account`);
    setLanguageToConfirm(null);
  }

  const profile = data?.profile;
  const visibleAvatar = avatarPreview ?? profile?.avatarUrl ?? null;

  if (state === "loading") {
    return <div data-testid="account-settings" data-account-state="loading"><ConsumerCard><ConsumerLoadingState label={t("loading")} /></ConsumerCard></div>;
  }

  if (state !== "ready" && state !== "empty") {
    const title = state === "unauthorized" ? t("unauthorizedTitle") : t("loadError");
    const message = state === "offline" ? t("offline") : state === "quota" ? t("quota") : state === "consent" ? t("consent") : t("loadError");
    return (
      <div data-testid="account-settings" data-account-state={state} data-account-error={state}>
        <ConsumerCard>
          <ConsumerErrorState title={title} message={message} />
          <div className="mt-5 flex justify-center"><ConsumerButton type="button" variant="secondary" text={t("retry")} onClick={() => void load()} data-testid="account-settings-retry" /></div>
        </ConsumerCard>
      </div>
    );
  }

  if (!profile) {
    return (
      <div data-testid="account-settings" data-account-state="empty">
        <ConsumerCard><ConsumerEmptyState title={t("emptyTitle")} message={t("emptyDescription")} /></ConsumerCard>
      </div>
    );
  }

  return (
    <div className="grid gap-6" data-testid="account-settings" data-account-state="ready" data-subscription-enabled={String(data?.subscription.enabled ?? false)}>
      <ConsumerCard>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="grid gap-3 sm:w-40 sm:justify-items-center">
            <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border border-[var(--blab-glass-border)] bg-[var(--blab-glass-fill)] text-3xl text-[var(--blab-color-primary)]" data-testid="account-avatar-preview">
              {visibleAvatar ? <Image src={visibleAvatar} alt={t("avatar")} width={96} height={96} unoptimized className="h-full w-full object-cover" /> : (profile.nickname ?? profile.name ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <label className="cursor-pointer text-center text-sm font-semibold text-[var(--blab-color-primary)] underline-offset-4 hover:underline">
              {t("avatarChoose")}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => chooseAvatar(event.target.files?.[0])} data-testid="account-avatar-input" />
            </label>
            {avatarFile ? <ConsumerButton type="button" variant="secondary" text={savingAvatar ? t("avatarSaving") : t("avatarSave")} loading={savingAvatar} loadingLabel={t("avatarSaving")} onClick={() => void saveAvatar()} data-testid="account-avatar-save" /> : null}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">{t("profileTitle")}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("profileDescription")}</p>
            <form onSubmit={(event) => void saveProfile(event)} className="mt-5 grid gap-4" data-testid="account-profile-form">
              <ConsumerTextField id="account-profile-nickname" data-testid="account-profile-nickname" label={t("nickname")} hintText={t("nicknamePlaceholder")} autoComplete="nickname" value={nickname} onChange={(event) => { setNickname(event.target.value); setNicknameError(false); }} error={nicknameError ? t("required") : undefined} required />
              <ConsumerTextField id="account-profile-email" label={t("email")} value={profile.email ?? ""} onChange={() => undefined} readOnly aria-readonly="true" />
              <div className="flex flex-wrap gap-3">
                <ConsumerButton type="submit" variant="primary" text={savingProfile ? t("saving") : t("save")} loading={savingProfile} loadingLabel={t("saving")} data-testid="account-profile-save" />
                <ConsumerButton type="button" variant="secondary" text={t("cancel")} onClick={() => { setNickname(profile.nickname ?? ""); setNicknameError(false); }} data-testid="account-profile-cancel" />
              </div>
              {profileSaved ? <p role="status" className="text-sm text-[var(--blab-color-success)]" data-testid="account-settings-saved">{t("saved")}</p> : null}
            </form>
            {avatarSaved ? <p role="status" className="mt-3 text-sm text-[var(--blab-color-success)]" data-testid="account-avatar-saved">{t("avatarSaved")}</p> : null}
            {avatarError ? <p role="alert" className="mt-3 text-sm text-rose-200" data-testid="account-avatar-error">{avatarFile ? t("avatarError") : t("avatarTypeError")}</p> : null}
          </div>
        </div>
      </ConsumerCard>

      <ConsumerCard>
        <h2 className="text-xl font-semibold">{t("preferencesTitle")}</h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="font-semibold">{t("theme")}</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("themeDescription")}</p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t("theme")} data-testid="account-theme">
              {([["system", "themeSystem"], ["light", "themeLight"], ["dark", "themeDark"]] as const).map(([value, key]) => <button key={value} type="button" aria-pressed={theme === value} onClick={() => selectTheme(value)} className="min-h-11 rounded-xl border border-[var(--blab-glass-border)] px-3 text-sm font-semibold data-[selected=true]:border-[var(--blab-color-primary)] data-[selected=true]:text-[var(--blab-color-primary)]" data-selected={theme === value} data-testid={`account-theme-${value}`}>{t(key)}</button>)}
            </div>
          </div>
          <div>
            <h3 className="font-semibold">{t("language")}</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("languageDescription")}</p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t("language")} data-testid="account-language">
              <button type="button" aria-pressed={locale === "ko"} onClick={() => locale !== "ko" && setLanguageToConfirm("ko")} className="min-h-11 rounded-xl border border-[var(--blab-glass-border)] px-3 text-sm font-semibold" data-selected={locale === "ko"} data-testid="account-language-ko">{t("languageKo")}</button>
              <button type="button" aria-pressed={locale === "en"} onClick={() => locale !== "en" && setLanguageToConfirm("en")} className="min-h-11 rounded-xl border border-[var(--blab-glass-border)] px-3 text-sm font-semibold" data-selected={locale === "en"} data-testid="account-language-en">{t("languageEn")}</button>
            </div>
          </div>
        </div>
      </ConsumerCard>

      <ConsumerCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-xl font-semibold">{t("securityTitle")}</h2><p className="mt-1 text-sm text-[var(--blab-text-tertiary)]">{t("password")}</p></div>
          <ConsumerButton type="button" variant="secondary" text={t("changePassword")} onClick={() => { setPasswordError(null); setPasswordOpen(true); }} data-testid="account-password-open" />
        </div>
        {passwordSaved ? <p role="status" className="mt-4 text-sm text-[var(--blab-color-success)]" data-testid="account-password-saved">{t("passwordSaved")}</p> : null}
      </ConsumerCard>

      <ConsumerCard>
        <h2 className="text-xl font-semibold">{t("legalTitle")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link href={`/${locale}/terms`} className="rounded-xl border border-[var(--blab-glass-border)] px-4 py-3 text-sm font-semibold underline-offset-4 hover:underline" data-testid="account-terms-link">{t("terms")}</Link>
          <Link href={`/${locale}/privacy`} className="rounded-xl border border-[var(--blab-glass-border)] px-4 py-3 text-sm font-semibold underline-offset-4 hover:underline" data-testid="account-privacy-link">{t("privacy")}</Link>
          <Link href="#consumer-ai-consent-heading" className="rounded-xl border border-[var(--blab-glass-border)] px-4 py-3 text-sm font-semibold underline-offset-4 hover:underline" data-testid="account-ai-consent-link">{t("aiConsent")}</Link>
          <Link href={`/${locale}/announcements`} className="rounded-xl border border-[var(--blab-glass-border)] px-4 py-3 text-sm font-semibold underline-offset-4 hover:underline" data-testid="account-announcements-link">{t("announcements")}</Link>
          <Link href={`/${locale}/account/notifications`} className="rounded-xl border border-[var(--blab-glass-border)] px-4 py-3 text-sm font-semibold underline-offset-4 hover:underline" data-testid="account-notifications-link">{t("notifications")}</Link>
        </div>
      </ConsumerCard>

      <ConsumerCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-xl font-semibold">{t("subscriptionTitle")}</h2><p className="mt-1 text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("subscriptionDescription")}</p></div>
          <span className="rounded-full border border-[var(--blab-glass-border)] px-3 py-2 text-sm font-semibold" data-testid="account-subscription-status" data-subscription-state="disabled">{t("subscriptionStatus")} · {t("subscriptionDisabled")}</span>
        </div>
        <Link href={`/${locale}/subscription`} className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-[var(--blab-glass-border)] px-4 text-sm font-semibold underline-offset-4 hover:underline" data-testid="account-subscription-link">{t("subscriptionOpen")}</Link>
      </ConsumerCard>

      <ConsumerCard>
        <div data-testid="account-sign-out"><SignOutButton locale={locale} /></div>
      </ConsumerCard>

      <Dialog open={languageToConfirm !== null} onOpenChange={(open) => { if (!open) setLanguageToConfirm(null); }}>
        <DialogContent className="border-[var(--blab-glass-border)] bg-[var(--blab-surface-elevated)] text-[var(--blab-text-primary)]" data-testid="account-language-dialog">
          <DialogHeader><DialogTitle>{t("languageConfirmTitle")}</DialogTitle><DialogDescription>{t("languageConfirmDescription")}</DialogDescription></DialogHeader>
          <DialogFooter>
            <DialogClose asChild><ConsumerButton type="button" variant="secondary" text={t("languageCancel")} /></DialogClose>
            <ConsumerButton type="button" variant="primary" text={t("languageConfirm")} onClick={confirmLanguage} data-testid="account-language-confirm" />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="border-[var(--blab-glass-border)] bg-[var(--blab-surface-elevated)] text-[var(--blab-text-primary)]" data-testid="account-password-dialog">
          <DialogHeader><DialogTitle>{t("changePassword")}</DialogTitle><DialogDescription>{t("passwordMin")}</DialogDescription></DialogHeader>
          <form onSubmit={(event) => void savePassword(event)} noValidate className="grid gap-4" data-testid="account-password-form">
            <ConsumerTextField id="account-current-password" data-testid="account-current-password" label={t("currentPassword")} obscureText autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
            <ConsumerTextField id="account-new-password" data-testid="account-new-password" label={t("newPassword")} obscureText autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
            <ConsumerTextField id="account-confirm-password" data-testid="account-confirm-password" label={t("confirmPassword")} obscureText autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
            {passwordError ? <p role="alert" className="text-sm text-rose-200" data-testid="account-password-error">{passwordError}</p> : null}
            <DialogFooter><DialogClose asChild><ConsumerButton type="button" variant="secondary" text={t("cancel")} /></DialogClose><ConsumerButton type="submit" variant="primary" text={t("passwordSave")} loading={savingPassword} loadingLabel={t("saving")} data-testid="account-password-save" /></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
