"use client";

import { useTranslations } from "next-intl";
import { ConsumerButton } from "@/components/consumer/blab-primitives";
import { formatBookDate } from "@/lib/consumer/types";
import type { ProgressEvent } from "@/lib/product/contracts";

type ProgressHistoryProps = {
  readonly history: readonly ProgressEvent[];
  readonly state: "loading" | "ready" | "error";
  readonly locale: "ko" | "en";
  readonly onRefetch: () => void;
};

export function ProgressHistory({ history, state, locale, onRefetch }: ProgressHistoryProps) {
  const t = useTranslations("consumer.reading");

  return (
    <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-5" data-testid="progress-history-section">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white">{t("historyTitle")}</h3>
        <span className="text-xs text-white/50" data-testid="progress-history-count">{history.length}</span>
      </div>
      {state === "loading" ? (
        <p className="mt-4 text-sm text-white/60" data-testid="progress-history-loading" aria-busy="true">{t("historyLoading")}</p>
      ) : state === "error" ? (
        <div className="mt-4 rounded-xl bg-rose-300/10 px-4 py-3 text-sm text-rose-100" role="alert" data-testid="progress-history-error">
          <p>{t("errors.history_unavailable")}</p>
          <ConsumerButton className="mt-3" type="button" variant="secondary" text={t("refetch")} onClick={onRefetch} data-testid="progress-history-refetch" />
        </div>
      ) : history.length === 0 ? (
        <p className="mt-4 text-sm text-white/60" data-testid="progress-history-empty">{t("historyEmpty")}</p>
      ) : (
        <ol className="mt-4 space-y-3" data-testid="progress-history">
          {history.map((event) => (
            <li key={event.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm" data-testid={`progress-history-${event.id}`}>
              <span className="font-medium text-white/85">{t("historyEntry", { from: event.previousPage, to: event.page })}</span>
              <time className="shrink-0 text-xs text-white/50" dateTime={event.createdAt}>{formatBookDate(event.createdAt, locale)}</time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
