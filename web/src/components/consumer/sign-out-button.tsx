"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export function SignOutButton({ locale }: { locale: string }) {
  const t = useTranslations("consumer");
  const [isPending, setIsPending] = useState(false);

  async function signOut() {
    setIsPending(true);
    await supabase.auth.signOut();
    window.location.assign(`/${locale}/auth/sign-in`);
  }

  return (
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
  );
}
