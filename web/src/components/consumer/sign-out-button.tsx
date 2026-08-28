"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { signOutUser } from "@/lib/consumer/auth";

export function SignOutButton({ locale }: { locale: string }) {
  const t = useTranslations("consumer");
  const [isPending, setIsPending] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function signOut() {
    setIsPending(true);
    setHasError(false);

    const succeeded = await signOutUser(supabase.auth);
    if (succeeded) {
      window.location.assign(`/${locale}/auth/sign-in`);
    } else {
      setHasError(true);
    }

    setIsPending(false);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={signOut}
        disabled={isPending}
        className="text-white/60 hover:bg-white/10 hover:text-white"
      >
        {t("nav.signOut")}
      </Button>
      {hasError ? (
        <p className="text-right text-xs text-rose-200" role="alert">
          {t("nav.signOutError")}
        </p>
      ) : null}
    </div>
  );
}
