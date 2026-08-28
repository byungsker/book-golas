"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function ConsumerHomeError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("consumer");

  return (
    <main className="mesh-gradient flex min-h-screen items-center justify-center px-4">
      <section className="max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
        <h1 className="text-xl font-semibold text-white">{t("states.errorTitle")}</h1>
        <p className="mt-3 text-sm leading-6 text-white/60">{t("states.errorDescription")}</p>
        <Button
          type="button"
          onClick={reset}
          className="mt-6 rounded-xl bg-indigo-400 text-white hover:bg-indigo-300"
        >
          {t("states.retry")}
        </Button>
      </section>
    </main>
  );
}
