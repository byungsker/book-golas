"use client";

import type { FormEvent } from "react";
import { ConsumerButton } from "@/components/consumer/blab-primitives";

type ProgressFormProps = {
  readonly bookId: string;
  readonly currentPage: number;
  readonly totalPages: number;
  readonly page: string;
  readonly statusLabel: string;
  readonly pagesLabel: string;
  readonly progressLabel: string;
  readonly currentPageLabel: string;
  readonly saveLabel: string;
  readonly savingLabel: string;
  readonly savedLabel: string;
  readonly completedLabel: string;
  readonly attemptLabel: string | null;
  readonly errorMessage: string | null;
  readonly conflict: boolean;
  readonly isSubmitting: boolean;
  readonly saved: boolean;
  readonly completed: boolean;
  readonly canRetry: boolean;
  readonly retryLabel: string;
  readonly refetchLabel: string;
  readonly onPageChange: (value: string) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onRetry: () => void;
  readonly onRefetch: () => void;
};

export function ProgressForm(props: ProgressFormProps) {
  const progress = props.totalPages > 0
    ? Math.min(100, Math.max(0, (props.currentPage / props.totalPages) * 100))
    : 0;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3" data-testid="progress-summary">
        <div>
          <p className="text-sm font-medium text-white/70">{props.progressLabel}</p>
          <p className="mt-1 text-lg font-semibold text-white" data-testid="progress-current-page">
            {props.currentPage} / {props.totalPages} {props.pagesLabel}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-indigo-200" data-testid="progress-status">{props.statusLabel}</p>
          <p className="mt-1 text-xs text-white/50" data-testid="progress-percent">{Math.round(progress)}%</p>
        </div>
      </div>

      <div className="mb-5 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={props.progressLabel} aria-valuemin={0} aria-valuemax={props.totalPages || 1} aria-valuenow={props.currentPage}>
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-sky-300" style={{ width: `${progress}%` }} />
      </div>

      <form onSubmit={props.onSubmit} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5" aria-busy={props.isSubmitting} noValidate data-testid="page-update" data-parity-actions="save-page-update mark-not-read cancel-page-update">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-44 flex-1">
            <label htmlFor={`current-page-${props.bookId}`} className="mb-2 block text-sm font-medium text-white/80">{props.currentPageLabel}</label>
            <input
              id={`current-page-${props.bookId}`}
              name="currentPage"
              type="number"
              inputMode="numeric"
              min={0}
              max={props.totalPages}
              value={props.page}
              onChange={(event) => props.onPageChange(event.target.value)}
              className="h-11 w-full rounded-xl border border-white/15 bg-black/20 px-3 text-base text-white outline-none transition placeholder:text-white/35 focus-visible:border-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-300/40"
              aria-describedby={props.errorMessage ? `progress-error-${props.bookId}` : undefined}
              data-testid="progress-page-input"
              required
            />
          </div>
          <span className="pb-2 text-sm text-white/55">/ {props.totalPages}</span>
          <ConsumerButton type="submit" disabled={props.isSubmitting} loading={props.isSubmitting} loadingLabel={props.savingLabel} data-testid="progress-submit">
            {props.saveLabel}
          </ConsumerButton>
        </div>

        {props.errorMessage ? (
          <div id={`progress-error-${props.bookId}`} className="mt-4 rounded-xl bg-rose-300/10 px-4 py-3 text-sm text-rose-100" data-testid="progress-error" role="alert">
            <p>{props.errorMessage}</p>
            {props.conflict ? (
              <ConsumerButton className="mt-3" type="button" variant="secondary" text={props.refetchLabel} onClick={props.onRefetch} data-testid="progress-refetch" />
            ) : props.canRetry ? (
              <ConsumerButton className="mt-3" type="button" variant="secondary" text={props.retryLabel} onClick={props.onRetry} data-testid="progress-retry" />
            ) : null}
          </div>
        ) : null}
        {props.saved ? <p className="mt-4 text-sm text-emerald-200" data-testid="progress-saved" role="status">{props.savedLabel}</p> : null}
        {props.completed ? <p className="mt-4 text-sm text-emerald-200" data-testid="progress-completed" role="status">{props.completedLabel}</p> : null}
        {props.attemptLabel ? <p className="mt-4 text-sm text-amber-200" data-testid="progress-attempt-message">{props.attemptLabel}</p> : null}
      </form>
    </>
  );
}
