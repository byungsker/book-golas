"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { ConsumerButton, ConsumerTextField } from "@/components/consumer/blab-primitives";
import {
  getEmailValidationError,
  getNicknameValidationError,
  getPasswordValidationError,
  getSignInErrorKey,
  isAccountExistenceError,
  readSavedEmail,
  signInWithPassword,
  signOutUser,
  type AuthMode,
  writeSavedEmail,
} from "@/lib/consumer/auth";
import {
  getOAuthStartErrorKey,
  oauthProviders,
  signInWithOAuth,
  type OAuthErrorKey,
  type OAuthProvider,
} from "@/lib/consumer/oauth";
import { getConsumerPath } from "@/lib/consumer/paths";
import { broadcastBrowserLogout } from "@/lib/consumer/timer-state";

type AuthFormProps = {
  mode: AuthMode;
  locale: "ko" | "en";
  nextPath: string;
  initialErrorKey?: OAuthErrorKey | null;
};

export function AuthForm({ mode, locale, nextPath, initialErrorKey = null }: AuthFormProps) {
  const t = useTranslations("consumer.auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [nickname, setNickname] = useState("");
  const [saveEmail, setSaveEmail] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(initialErrorKey);
  const [successKey, setSuccessKey] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (mode !== "sign-in") return;
    const savedEmail = readSavedEmail(window.localStorage);
    if (!savedEmail) return;
    setEmail(savedEmail);
    setSaveEmail(true);
  }, [mode]);

  useEffect(() => {
    if (mode !== "reset-password") return;

    if (new URLSearchParams(window.location.search).get("recovery") === "1") {
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session) setIsRecovery(true);
      });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setIsRecovery(true);
    });

    return () => subscription.unsubscribe();
  }, [mode]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorKey(null);
    setSuccessKey(null);
    setUnconfirmedEmail(null);

    const emailValidationError = getEmailValidationError(email);
    if ((mode !== "reset-password" || !isRecovery) && emailValidationError) {
      setErrorKey(emailValidationError === "required" ? "errors.emailRequired" : "errors.emailInvalid");
      return;
    }

    if (mode === "sign-up" && getNicknameValidationError(nickname)) {
      setErrorKey("errors.nicknameRequired");
      return;
    }

    if ((mode !== "reset-password" || isRecovery) && !password) {
      setErrorKey("errors.passwordRequired");
      return;
    }

    const passwordValidationError = getPasswordValidationError(mode, isRecovery, password, confirmation);
    if (passwordValidationError) {
      setErrorKey(passwordValidationError === "short" ? "errors.passwordShort" : "errors.passwordMismatch");
      return;
    }

    setIsPending(true);
    const normalizedEmail = email.trim();

    try {
      if (mode === "sign-in") {
        const { error } = await signInWithPassword(supabase.auth, normalizedEmail, password);
        if (error) {
          const nextErrorKey = getSignInErrorKey(error.message);
          setErrorKey(nextErrorKey);
          if (nextErrorKey === "errors.emailUnconfirmed") {
            setUnconfirmedEmail(normalizedEmail);
          }
          return;
        }
        writeSavedEmail(window.localStorage, normalizedEmail, saveEmail);
        window.location.assign(nextPath);
        return;
      }

      if (mode === "sign-up") {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${getConsumerPath(locale, "/auth/sign-in")}`,
            data: { name: nickname.trim() },
          },
        });
        if (error) {
          if (isAccountExistenceError(error.message)) {
            setSuccessKey("confirmationSent");
            return;
          }
          setErrorKey("errors.generic");
          return;
        }
        if (data.session) {
          window.location.assign(nextPath);
          return;
        }
        setSuccessKey("confirmationSent");
        return;
      }

      if (isRecovery) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          setErrorKey(error.message.toLowerCase().includes("password") ? "errors.passwordRejected" : "errors.generic");
          return;
        }
        const signedOut = await signOutUser(supabase.auth);
        if (!signedOut) {
          setErrorKey("errors.signOutFailed");
          return;
        }
        broadcastBrowserLogout();
        setSuccessKey("passwordUpdated");
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}${getConsumerPath(locale, "/auth/reset-password")}?recovery=1`,
      });
      if (error) {
        if (isAccountExistenceError(error.message)) {
          setSuccessKey("resetSent");
          return;
        }
        setErrorKey("errors.generic");
        return;
      }
      setSuccessKey("resetSent");
    } catch {
      setErrorKey("errors.generic");
    } finally {
      setIsPending(false);
    }
  }

  async function resendVerification() {
    if (!unconfirmedEmail || resendCooldown > 0 || isPending) return;
    setErrorKey(null);
    setSuccessKey(null);
    setIsPending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: unconfirmedEmail,
      });
      if (error && !isAccountExistenceError(error.message)) {
        setErrorKey("errors.generic");
        return;
      }
      setSuccessKey("verificationSent");
      setResendCooldown(60);
    } catch {
      setErrorKey("errors.generic");
    } finally {
      setIsPending(false);
    }
  }

  async function startOAuth(provider: OAuthProvider) {
    setErrorKey(null);
    setSuccessKey(null);
    setIsPending(true);

    try {
      const { data, error } = await signInWithOAuth(supabase.auth, provider, {
        origin: window.location.origin,
        locale,
        returnTo: nextPath,
      });
      if (error) {
        setErrorKey(getOAuthStartErrorKey(error));
        return;
      }
      if (!data.url) {
        setErrorKey("errors.oauthProvider");
        return;
      }
      window.location.assign(data.url);
    } catch (error) {
      setErrorKey(getOAuthStartErrorKey(error));
    } finally {
      setIsPending(false);
    }
  }

  const title =
    mode === "sign-in"
      ? t("signInTitle")
      : mode === "sign-up"
        ? t("signUpTitle")
        : isRecovery
          ? t("recoveryTitle")
          : t("resetTitle");
  const description =
    mode === "sign-in"
      ? t("signInDescription")
      : mode === "sign-up"
        ? t("signUpDescription")
        : isRecovery
          ? t("recoveryDescription")
          : t("resetDescription");
  const isEmailForm = mode !== "reset-password" || !isRecovery;
  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <Link
          href={getConsumerPath(locale, "")}
          className="text-sm text-[var(--blab-text-tertiary)] transition hover:text-[var(--blab-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]"
        >
          {t("backToSite")}
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[var(--blab-text-primary)]">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--blab-text-tertiary)]">{description}</p>
      </div>

      <form
        onSubmit={submit}
        noValidate
        className="rounded-[var(--blab-radius-card)] border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-[var(--blab-space-xxl)] shadow-[var(--blab-elevation-surface)] sm:p-8"
        aria-busy={isPending}
      >
        {isEmailForm ? (
          <div className="space-y-2">
            <ConsumerTextField
              id="consumer-email"
              label={t("email")}
              inputType="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
        ) : null}

        {mode !== "reset-password" || isRecovery ? (
          <div className="mt-5 space-y-2">
            <ConsumerTextField
              id="consumer-password"
              label={isRecovery ? t("newPassword") : t("password")}
              obscureText
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
        ) : null}

        {mode === "sign-up" ? (
          <div className="mt-5 space-y-2">
            <ConsumerTextField
              id="consumer-nickname"
              label={t("nickname")}
              autoComplete="nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              required
            />
          </div>
        ) : null}

        {mode === "reset-password" && isRecovery ? (
          <div className="mt-5 space-y-2">
            <ConsumerTextField
              id="consumer-password-confirm"
              label={t("confirmPassword")}
              obscureText
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              required
            />
          </div>
        ) : null}

        {mode === "sign-in" ? (
          <label className="mt-5 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-[var(--blab-text-secondary)]">
            <input
              type="checkbox"
              checked={saveEmail}
              onChange={(event) => setSaveEmail(event.target.checked)}
              className="size-5 rounded border-[var(--blab-glass-border)] accent-[var(--blab-color-primary)]"
            />
            <span>{t("saveEmail")}</span>
          </label>
        ) : null}

        {errorKey ? (
          <p className="mt-5 text-sm leading-6 text-[var(--blab-color-error)]" role="alert">
            {t(errorKey as never)}
          </p>
        ) : null}
        {successKey ? (
          <p className="mt-5 text-sm leading-6 text-[var(--blab-color-success)]" role="status">
            {t(successKey as never)}
          </p>
        ) : null}

        {unconfirmedEmail ? (
          <div className="mt-5 rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-glass-fill)] p-[var(--blab-space-lg)]">
            <p className="text-sm leading-6 text-[var(--blab-text-secondary)]">
              {t("emailUnconfirmedDescription")}
            </p>
            <ConsumerButton
              type="button"
              variant="secondary"
              disabled={isPending || resendCooldown > 0}
              loading={isPending}
              loadingLabel={t("processing")}
              onClick={resendVerification}
              className="mt-3"
            >
              {resendCooldown > 0
                ? t("resendCooldown", { seconds: resendCooldown })
                : t("resendVerification")}
            </ConsumerButton>
          </div>
        ) : null}

        <ConsumerButton
          type="submit"
          disabled={isPending}
          isFullWidth
          loading={isPending}
          loadingLabel={t("processing")}
          className="mt-6"
        >
          {isPending
            ? t("processing")
            : mode === "sign-in"
              ? t("signIn")
              : mode === "sign-up"
                ? t("signUp")
                : isRecovery
                  ? t("updatePassword")
                  : t("sendReset")}
        </ConsumerButton>

        {mode === "sign-in" ? (
          <div className="mt-5">
            <div className="flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-[var(--blab-glass-border)]" />
              <span className="text-sm text-[var(--blab-text-tertiary)]">{t("or")}</span>
              <span className="h-px flex-1 bg-[var(--blab-glass-border)]" />
            </div>
            <div className="mt-5 grid gap-3">
              {oauthProviders.map((provider) => (
                <ConsumerButton
                  key={provider}
                  type="button"
                  variant="secondary"
                  isFullWidth
                  disabled={isPending}
                  onClick={() => startOAuth(provider)}
                >
                  {provider === "google" ? t("continueWithGoogle") : t("continueWithApple")}
                </ConsumerButton>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
              <Link
                href={getConsumerPath(locale, "/auth/reset-password")}
                className="text-[var(--blab-color-primary)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]"
              >
                {t("forgotPassword")}
              </Link>
              <Link
                href={getConsumerPath(locale, "/auth/sign-up")}
                className="text-[var(--blab-text-tertiary)] underline-offset-4 hover:text-[var(--blab-text-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]"
              >
                {t("createAccount")}
              </Link>
            </div>
          </div>
        ) : null}

        {mode === "sign-up" ? (
          <p className="mt-5 text-center text-sm text-[var(--blab-text-tertiary)]">
            {t("hasAccount")} {" "}
            <Link
              href={getConsumerPath(locale, "/auth/sign-in")}
              className="text-[var(--blab-color-primary)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]"
            >
              {t("signInLink")}
            </Link>
          </p>
        ) : null}

        {mode === "reset-password" && (!isRecovery || successKey === "passwordUpdated") ? (
          <p className="mt-5 text-center text-sm text-[var(--blab-text-tertiary)]">
            <Link
              href={getConsumerPath(locale, "/auth/sign-in")}
              className="text-[var(--blab-color-primary)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]"
            >
              {t("backToSignIn")}
            </Link>
          </p>
        ) : null}
      </form>
    </div>
  );
}
