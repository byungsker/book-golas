"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { updateReadingProgress } from "@/app/actions/reading-progress";

type ProgressUpdaterProps = {
  locale: "ko" | "en";
  bookId: string;
  currentPage: number;
  totalPages: number;
};

export function ProgressUpdater({
  locale,
  bookId,
  currentPage,
  totalPages,
}: ProgressUpdaterProps) {
  const t = useTranslations("consumer");
  const router = useRouter();
  const [page, setPage] = useState(String(currentPage));
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    setErrorCode(null);

    const nextPage = Number(page);
    if (!Number.isSafeInteger(nextPage) || nextPage < 0 || nextPage > totalPages) {
      setErrorCode("invalid_input");
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateReadingProgress({
          locale,
          bookId,
          currentPage: nextPage,
        });

        if (!result.ok) {
          setErrorCode(result.code);
          if (result.code === "history_unavailable") router.refresh();
          return;
        }

        setPage(String(result.book.currentPage));
        setSaved(true);
        router.refresh();
      } catch {
        setErrorCode("unavailable");
      }
    });
  }

  const errorMessage = errorCode
    ? t(`reading.errors.${errorCode}` as never)
    : null;

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
      aria-busy={isPending}
    >
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-44 flex-1">
          <label
            htmlFor={`current-page-${bookId}`}
            className="mb-2 block text-sm font-medium text-white/80"
          >
            {t("reading.currentPage")}
          </label>
          <input
            id={`current-page-${bookId}`}
            name="currentPage"
            type="number"
            inputMode="numeric"
            min={0}
            max={totalPages}
            value={page}
            onChange={(event) => setPage(event.target.value)}
            className="h-11 w-full rounded-xl border border-white/15 bg-black/20 px-3 text-base text-white outline-none transition placeholder:text-white/35 focus-visible:border-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-300/40"
            aria-describedby={errorMessage ? `progress-error-${bookId}` : undefined}
            required
          />
        </div>
        <span className="pb-2 text-sm text-white/55">/ {totalPages}</span>
        <Button
          type="submit"
          disabled={isPending || totalPages < 0}
          className="h-11 rounded-xl bg-indigo-400 px-5 text-white hover:bg-indigo-300"
        >
          {isPending ? t("reading.saving") : t("reading.save")}
        </Button>
      </div>

      {errorMessage ? (
        <p
          id={`progress-error-${bookId}`}
          className="mt-4 text-sm text-rose-200"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
      {saved ? (
        <p className="mt-4 text-sm text-emerald-200" role="status">
          {t("reading.saved")}
        </p>
      ) : null}
    </form>
  );
}
