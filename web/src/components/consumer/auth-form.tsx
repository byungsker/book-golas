"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getConsumerPath } from "@/lib/consumer/paths";

type AuthMode = "sign-in" | "sign-up" | "reset-password";

type AuthFormProps = {
  mode: AuthMode;
  locale: "ko" | "en";
  nextPath: string;
};

export function AuthForm({ mode, locale, nextPath }: AuthFormProps) {
  const t = useTranslations("consumer.auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isRecovery, setIsRecovery] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [successKey, setSuccessKey] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "reset-password") return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setIsRecovery(true);
    });

    return () => subscription.unsubscribe();
  }, [mode]);

  function getAuthErrorKey(message: string): string {
    const normalized = message.toLowerCase();
    if (normalized.includes("invalid login credentials")) {
      return "errors.invalidCredentials";
    }
    if (normalized.includes("already registered")) return "errors.emailInUse";
    if (normalized.includes("password")) return "errors.passwordRejected";
    return "errors.generic";
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorKey(null);
    setSuccessKey(null);

    if (mode === "reset-password" && isRecovery) {
      if (password.length < 8) {
        setErrorKey("errors.passwordShort");
        return;
      }
      if (password !== confirmation) {
        setErrorKey("errors.passwordMismatch");
        return;
      }
    }

    setIsPending(true);

    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setErrorKey(getAuthErrorKey(error.message));
          return;
        }
        window.location.assign(nextPath);
        return;
      }

      if (mode === "sign-up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${getConsumerPath(locale, "/auth/sign-in")}`,
          },
        });
        if (error) {
          setErrorKey(getAuthErrorKey(error.message));
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
          setErrorKey(getAuthErrorKey(error.message));
          return;
        }
        await supabase.auth.signOut();
        setSuccessKey("passwordUpdated");
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${getConsumerPath(locale, "/auth/reset-password")}`,
      });
      if (error) {
        setErrorKey(getAuthErrorKey(error.message));
        return;
      }
      setSuccessKey("resetSent");
    } catch {
      setErrorKey("errors.generic");
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
          className="text-sm text-white/55 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        >
          {t("backToSite")}
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-white/60">{description}</p>
      </div>

      <form
        onSubmit={submit}
        className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 sm:p-8"
        aria-busy={isPending}
      >
        {isEmailForm ? (
          <div className="space-y-2">
            <Label htmlFor="consumer-email" className="text-white/80">
              {t("email")}
            </Label>
            <Input
              id="consumer-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 border-white/15 bg-black/20 text-white"
              required
            />
          </div>
        ) : null}

        {mode !== "reset-password" || isRecovery ? (
          <div className="mt-5 space-y-2">
            <Label htmlFor="consumer-password" className="text-white/80">
              {isRecovery ? t("newPassword") : t("password")}
            </Label>
            <Input
              id="consumer-password"
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 border-white/15 bg-black/20 text-white"
              minLength={8}
              required
            />
          </div>
        ) : null}

        {mode === "reset-password" && isRecovery ? (
          <div className="mt-5 space-y-2">
            <Label htmlFor="consumer-password-confirm" className="text-white/80">
              {t("confirmPassword")}
            </Label>
            <Input
              id="consumer-password-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="h-11 border-white/15 bg-black/20 text-white"
              minLength={8}
              required
            />
          </div>
        ) : null}

        {errorKey ? (
          <p className="mt-5 text-sm leading-6 text-rose-200" role="alert">
            {t(errorKey as never)}
          </p>
        ) : null}
        {successKey ? (
          <p className="mt-5 text-sm leading-6 text-emerald-200" role="status">
            {t(successKey as never)}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={isPending}
          className="mt-6 h-11 w-full rounded-xl bg-indigo-400 text-white hover:bg-indigo-300"
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
        </Button>

        {mode === "sign-in" ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
            <Link
              href={getConsumerPath(locale, "/auth/reset-password")}
              className="text-indigo-200 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              {t("forgotPassword")}
            </Link>
            <Link
              href={getConsumerPath(locale, "/auth/sign-up")}
              className="text-white/60 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              {t("createAccount")}
            </Link>
          </div>
        ) : null}

        {mode === "sign-up" ? (
          <p className="mt-5 text-center text-sm text-white/60">
            {t("hasAccount")} {" "}
            <Link
              href={getConsumerPath(locale, "/auth/sign-in")}
              className="text-indigo-200 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              {t("signInLink")}
            </Link>
          </p>
        ) : null}

        {mode === "reset-password" && !isRecovery ? (
          <p className="mt-5 text-center text-sm text-white/60">
            <Link
              href={getConsumerPath(locale, "/auth/sign-in")}
              className="text-indigo-200 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              {t("backToSignIn")}
            </Link>
          </p>
        ) : null}
      </form>
    </div>
  );
}
