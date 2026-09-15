"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { ConsumerButton } from "@/components/consumer/blab-primitives";
import { signOutUser } from "@/lib/consumer/auth";
import { broadcastBrowserLogout } from "@/lib/consumer/timer-state";

export function SignOutButton({ locale }: { locale: string }) {
  const t = useTranslations("consumer");
  const [isPending, setIsPending] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function signOut() {
    setIsPending(true);
    setHasError(false);

    const succeeded = await signOutUser(supabase.auth);
    if (succeeded) {
      broadcastBrowserLogout();
      window.location.assign(`/${locale}/auth/sign-in`);
    } else {
      setHasError(true);
    }

    setIsPending(false);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <ConsumerButton
        type="button"
        variant="secondary"
        onClick={signOut}
        disabled={isPending}
        loading={isPending}
        loadingLabel={t("nav.signOut")}
      >
        {t("nav.signOut")}
      </ConsumerButton>
      {hasError ? (
        <p className="text-right text-xs text-rose-200" role="alert">
          {t("nav.signOutError")}
        </p>
      ) : null}
    </div>
  );
}
