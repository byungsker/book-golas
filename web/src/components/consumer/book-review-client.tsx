"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Download, Link2, Sparkles } from "lucide-react";
import {
  ConsumerButton,
  ConsumerCard,
  ConsumerEmptyState,
  ConsumerLoadingState,
} from "@/components/consumer/blab-primitives";
import type { ConsumerLocale } from "@/lib/consumer/paths";
import {
  ReviewResponseSchema,
  consumerRoutes,
  reviewShareCard,
  type Book,
  type ReviewEditorState,
} from "@/lib/product/contracts";
import type { ProductError } from "@/lib/product/dal/errors";

type BookReviewClientProps = {
  locale: ConsumerLocale;
  initialBook: Book;
};

type SaveState = "idle" | "saving" | "saved" | "error";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readError(value: unknown, status: number): ProductError {
  if (isRecord(value) && isRecord(value.error)) {
    const error = value.error;
    if (
      typeof error.code === "string" &&
      typeof error.message === "string" &&
      typeof error.status === "number" &&
      typeof error.retryable === "boolean"
    ) {
      return {
        code: error.code as ProductError["code"],
        message: error.message,
        status: error.status as ProductError["status"],
        retryable: error.retryable,
      };
    }
  }
  return {
    code: status === 401 ? "unauthorized" : status === 404 ? "not_found" : "unavailable",
    message: "Review action failed.",
    status: status === 401 ? 401 : status === 404 ? 404 : 503,
    retryable: status !== 401 && status !== 404,
  };
}

function requestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "00000000-0000-4000-8000-000000000437";
}

function errorForCaught(value: unknown): ProductError {
  if (isRecord(value) && typeof value.code === "string") return value as ProductError;
  return {
    code: "offline",
    message: "Review action is offline.",
    status: 503,
    retryable: true,
  };
}

function aiStateForError(error: ProductError): ReviewEditorState {
  if (error.code === "consent_required") return "consent";
  if (error.code === "quota_exceeded") return "quota";
  if (error.code === "timeout") return "timeout";
  if (error.code === "provider_error") return "provider_error";
  if (error.code === "offline") return "offline";
  return "error";
}

function storageKey(bookId: string): string {
  return `bookgolas:review-draft:${bookId}`;
}

function copyWithLegacyFallback(value: string): boolean {
  if (typeof document === "undefined") return false;
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  textarea.remove();
  return copied;
}

export function BookReviewClient({ locale, initialBook }: BookReviewClientProps) {
  const t = useTranslations("consumer.reviewEditor");
  const [book, setBook] = useState(initialBook);
  const [rating, setRating] = useState<number | null>(initialBook.rating);
  const [review, setReview] = useState(initialBook.review ?? "");
  const [longReview, setLongReview] = useState(initialBook.longReview ?? "");
  const [reviewLink, setReviewLink] = useState(initialBook.reviewLink ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<ProductError | null>(null);
  const [aiConsent, setAiConsent] = useState(false);
  const [aiState, setAiState] = useState<ReviewEditorState>("idle");
  const [aiError, setAiError] = useState<ProductError | null>(null);
  const [generatedDraft, setGeneratedDraft] = useState("");
  const [shareStatus, setShareStatus] = useState<"native" | "clipboard" | "download" | "cancelled" | null>(null);
  const [canonicalUrl, setCanonicalUrl] = useState(consumerRoutes.review(locale, initialBook.id));
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftUsed, setDraftUsed] = useState(false);

  const canonicalPath = useMemo(() => consumerRoutes.review(locale, book.id), [book.id, locale]);
  const hasSavedReview = Boolean(book.review?.trim() || book.longReview?.trim() || book.reviewLink || book.rating !== null);
  const hasCurrentContent = Boolean(review.trim() || longReview.trim() || reviewLink.trim() || rating !== null);
  const hasUnsavedChanges = rating !== book.rating || review !== (book.review ?? "") || longReview !== (book.longReview ?? "") || reviewLink !== (book.reviewLink ?? "");

  useEffect(() => {
    setCanonicalUrl(new URL(canonicalPath, window.location.origin).toString());
  }, [canonicalPath]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey(initialBook.id));
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isRecord(parsed) && parsed.version === 1) {
          if (typeof parsed.rating === "number" && Number.isInteger(parsed.rating)) setRating(parsed.rating);
          if (typeof parsed.review === "string") setReview(parsed.review);
          if (typeof parsed.longReview === "string") setLongReview(parsed.longReview);
          if (typeof parsed.reviewLink === "string") setReviewLink(parsed.reviewLink);
          setDraftRestored(true);
        }
      }
    } catch {
      // A disabled or corrupt local store must not prevent the editor from opening.
    } finally {
      setDraftLoaded(true);
    }
  }, [initialBook.id]);

  useEffect(() => {
    if (!draftLoaded) return;
    try {
      if (!hasUnsavedChanges) {
        window.localStorage.removeItem(storageKey(book.id));
        return;
      }
      window.localStorage.setItem(storageKey(book.id), JSON.stringify({
        version: 1,
        rating,
        review,
        longReview,
        reviewLink,
      }));
    } catch {
      // The server remains the source of truth when local persistence is unavailable.
    }
  }, [book.id, draftLoaded, hasUnsavedChanges, longReview, rating, review, reviewLink]);

  function errorMessage(error: ProductError): string {
    if (error.code === "validation_error") return t("errors.validation");
    if (error.code === "unauthorized") return t("errors.unauthorized");
    if (error.code === "not_found" || error.code === "forbidden") return t("errors.notFound");
    if (error.code === "consent_required") return t("errors.consent");
    if (error.code === "quota_exceeded") return t("errors.quota");
    if (error.code === "timeout") return t("errors.timeout");
    if (error.code === "provider_error") return t("errors.provider");
    if (error.code === "offline") return t("errors.offline");
    return t("errors.generic");
  }

  async function saveReview() {
    if (saveState === "saving") return;
    setSaveState("saving");
    setSaveError(null);
    try {
      const response = await fetch("/api/consumer/review-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          action: "save",
          locale,
          bookId: book.id,
          rating,
          review: review.trim() || null,
          longReview: longReview.trim() || null,
          reviewLink: reviewLink.trim() || null,
          idempotencyKey: requestId(),
        }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw readError(body, response.status);
      const parsed = ReviewResponseSchema.safeParse(body);
      if (!parsed.success || parsed.data.kind !== "saved") {
        throw {
          code: "unavailable",
          message: "Malformed review response.",
          status: 503,
          retryable: true,
        } satisfies ProductError;
      }
      setBook(parsed.data.book);
      setRating(parsed.data.book.rating);
      setReview(parsed.data.book.review ?? "");
      setLongReview(parsed.data.book.longReview ?? "");
      setReviewLink(parsed.data.book.reviewLink ?? "");
      setCanonicalUrl(parsed.data.canonicalUrl);
      setSaveState("saved");
      setDraftRestored(false);
      try {
        window.localStorage.removeItem(storageKey(book.id));
      } catch {
        // The save itself succeeded even if local cleanup is unavailable.
      }
    } catch (caught) {
      setSaveState("error");
      setSaveError(errorForCaught(caught));
    }
  }

  async function generateDraft() {
    if (aiState === "generating") return;
    setDraftUsed(false);
    setAiError(null);
    if (!aiConsent) {
      setAiState("consent");
      return;
    }
    setAiState("generating");
    try {
      const response = await fetch("/api/consumer/review-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          action: "generate",
          locale,
          bookId: book.id,
          aiConsent,
          idempotencyKey: requestId(),
        }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw readError(body, response.status);
      const parsed = ReviewResponseSchema.safeParse(body);
      if (!parsed.success || parsed.data.kind !== "draft") {
        throw {
          code: "unavailable",
          message: "Malformed AI draft response.",
          status: 503,
          retryable: true,
        } satisfies ProductError;
      }
      setGeneratedDraft(parsed.data.draft);
      setAiState(parsed.data.draft.trim() ? "draft" : "empty");
    } catch (caught) {
      const error = errorForCaught(caught);
      setAiError(error);
      setAiState(aiStateForError(error));
    }
  }

  function useDraft() {
    if (!generatedDraft.trim()) return;
    setLongReview(generatedDraft);
    setDraftUsed(true);
    setAiState("draft");
  }

  function clearLocalDraft() {
    setRating(book.rating);
    setReview(book.review ?? "");
    setLongReview(book.longReview ?? "");
    setReviewLink(book.reviewLink ?? "");
    setDraftRestored(false);
    setDraftUsed(false);
    try {
      window.localStorage.removeItem(storageKey(book.id));
    } catch {
      // Clearing the visible state is still useful when storage is unavailable.
    }
  }

  function shareCard(): string {
    return reviewShareCard({
      book: {
        ...book,
        rating,
        review: review.trim() || null,
        longReview: longReview.trim() || null,
      },
      canonicalUrl,
    });
  }

  async function copyLink(): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(canonicalUrl);
        return true;
      }
    } catch {
      // Use the legacy browser path below.
    }
    return copyWithLegacyFallback(canonicalUrl);
  }

  async function handleCopy() {
    const copied = await copyLink();
    setShareStatus(copied ? "clipboard" : "download");
    if (!copied) downloadCard();
  }

  async function handleShare() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: book.title,
          text: review.trim() || longReview.trim() || t("shareDescription"),
          url: canonicalUrl,
        });
        setShareStatus("native");
        return;
      } catch (caught) {
        if (isRecord(caught) && caught.name === "AbortError") {
          setShareStatus("cancelled");
          return;
        }
      }
    }
    await handleCopy();
  }

  function downloadCard() {
    const blob = new Blob([shareCard()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${book.title.replace(/[^a-z0-9가-힣]+/gi, "-").replace(/^-|-$/g, "") || "bookgolas-review"}-share-card.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setShareStatus("download");
  }

  return (
    <div className="bookgolas-consumer-page min-h-screen bg-[var(--blab-surface-scaffold)] text-[var(--blab-text-primary)]" data-testid="review-editor" data-review-content-state={hasSavedReview ? "saved" : "empty"} data-review-ai-state={aiState}>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <Link href={`/${locale}/books/${book.id}`} className="inline-flex min-h-10 items-center rounded-xl px-2 text-sm text-[var(--blab-text-tertiary)] underline-offset-4 hover:text-[var(--blab-text-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" data-testid="review-back">
          ← {t("bookLabel")}
        </Link>
        <p className="mt-6 text-sm font-medium text-[var(--blab-color-primary)]">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("description")}</p>

        <ConsumerCard className="mt-8" data-testid="review-form-card">
          <div className="flex flex-col gap-2 border-b border-[var(--blab-glass-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--blab-color-primary)]">{t("bookLabel")}</p>
              <h2 className="mt-2 text-xl font-semibold">{book.title}</h2>
              {book.author ? <p className="mt-1 text-sm text-[var(--blab-text-tertiary)]">{book.author}</p> : null}
            </div>
            {draftRestored ? <p className="text-sm text-[var(--blab-color-success)]" data-testid="review-draft-restored" role="status">{t("draftRestored")}</p> : null}
          </div>

          <fieldset className="mt-6">
            <legend className="text-sm font-medium">{t("rating")}</legend>
            <div className="mt-3 flex flex-wrap items-center gap-2" data-testid="review-rating">
              <button type="button" aria-pressed={rating === null} onClick={() => setRating(null)} className={`min-h-10 rounded-xl border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)] ${rating === null ? "border-[var(--blab-color-primary)] bg-[var(--blab-color-primary)]/15" : "border-[var(--blab-glass-border)]"}`} data-testid="review-rating-none">{t("noRating")}</button>
              {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${value}/5`} aria-pressed={rating === value} onClick={() => setRating(value)} className={`min-h-10 min-w-10 rounded-xl border text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)] ${rating !== null && rating >= value ? "border-amber-300/60 bg-amber-300/15 text-amber-200" : "border-[var(--blab-glass-border)] text-[var(--blab-text-tertiary)]"}`} data-testid={`review-rating-${value}`}>★</button>)}
            </div>
          </fieldset>

          <div className="mt-6 grid gap-5">
            <label className="grid gap-2 text-sm font-medium" htmlFor="review-short-text">
              {t("review")}
              <input id="review-short-text" value={review} onChange={(event) => setReview(event.target.value)} maxLength={500} placeholder={t("reviewPlaceholder")} className="min-h-12 rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface)] px-4 text-base font-normal text-[var(--blab-text-primary)] outline-none focus:border-[var(--blab-color-primary)] focus:ring-2 focus:ring-[var(--blab-color-primary)]/30" data-testid="review-short-text" />
            </label>
            <label className="grid gap-2 text-sm font-medium" htmlFor="review-long-text">
              {t("longReview")}
              <textarea id="review-long-text" value={longReview} onChange={(event) => setLongReview(event.target.value)} maxLength={20_000} rows={8} placeholder={t("longReviewPlaceholder")} className="rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface)] px-4 py-3 text-base font-normal leading-6 text-[var(--blab-text-primary)] outline-none focus:border-[var(--blab-color-primary)] focus:ring-2 focus:ring-[var(--blab-color-primary)]/30" data-testid="review-long-text" />
            </label>
            <label className="grid gap-2 text-sm font-medium" htmlFor="review-link">
              {t("reviewLink")}
              <input id="review-link" type="url" value={reviewLink} onChange={(event) => setReviewLink(event.target.value)} placeholder={t("reviewLinkPlaceholder")} className="min-h-12 rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface)] px-4 text-base font-normal text-[var(--blab-text-primary)] outline-none focus:border-[var(--blab-color-primary)] focus:ring-2 focus:ring-[var(--blab-color-primary)]/30" data-testid="review-link" />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ConsumerButton type="button" variant="primary" text={saveState === "saving" ? t("saving") : t("save")} loading={saveState === "saving"} loadingLabel={t("saving")} onClick={() => void saveReview()} data-testid="review-save" />
            <ConsumerButton type="button" variant="secondary" text={t("clearDraft")} onClick={clearLocalDraft} data-testid="review-clear-draft" />
            {draftLoaded && hasCurrentContent ? <span className="text-sm text-[var(--blab-text-tertiary)]" data-testid="review-local-draft-status">{t("draftSaved")}</span> : null}
          </div>
          {saveState === "saved" ? <p className="mt-4 rounded-xl bg-[var(--blab-color-success)]/10 px-4 py-3 text-sm text-[var(--blab-color-success)]" role="status" data-testid="review-save-status">{t("saved")}</p> : null}
          {saveError ? <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100" role="alert" data-testid="review-save-error">{errorMessage(saveError)}</p> : null}
        </ConsumerCard>

        <ConsumerCard className="mt-6" data-testid="review-ai-card">
          <div className="flex items-start gap-3">
            <Sparkles aria-hidden="true" className="mt-0.5 text-[var(--blab-color-primary)]" size={21} />
            <div>
              <h2 className="text-xl font-semibold">{t("aiTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("aiDescription")}</p>
            </div>
          </div>
          <label className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface)] p-4 text-sm leading-6 text-[var(--blab-text-secondary)]">
            <input type="checkbox" checked={aiConsent} onChange={(event) => { setAiConsent(event.target.checked); if (event.target.checked && aiState === "consent") setAiState("idle"); }} className="mt-1 h-4 w-4" data-testid="review-ai-consent" />
            <span>{t("aiConsent")}</span>
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ConsumerButton type="button" variant="secondary" text={aiState === "generating" ? t("generating") : t("generate")} loading={aiState === "generating"} loadingLabel={t("generating")} icon={<Sparkles aria-hidden="true" size={16} />} onClick={() => void generateDraft()} data-testid="review-ai-generate" />
            {aiState === "generating" ? <ConsumerLoadingState label={t("generating")} data-testid="review-ai-loading" /> : null}
          </div>
          {aiState === "consent" ? <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100" role="alert" data-testid="review-ai-consent-error">{t("errors.consent")}</p> : null}
          {aiError && aiState !== "consent" ? <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100" role="alert" data-testid="review-ai-error">{errorMessage(aiError)}</p> : null}
          {aiState === "empty" ? <div className="mt-5" data-testid="review-ai-empty"><ConsumerEmptyState title={t("draftEmptyTitle")} message={t("draftEmptyDescription")} /></div> : null}
          {generatedDraft ? <div className="mt-5 rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface)] p-4" data-testid="review-ai-draft-card">
            <label className="grid gap-2 text-sm font-medium" htmlFor="review-ai-draft">{t("draftLabel")}<textarea id="review-ai-draft" value={generatedDraft} readOnly rows={6} className="rounded-xl border border-[var(--blab-glass-border)] bg-black/10 px-4 py-3 text-sm font-normal leading-6 text-[var(--blab-text-primary)]" data-testid="review-ai-draft" /></label>
            <div className="mt-3 flex flex-wrap items-center gap-3"><ConsumerButton type="button" variant="primary" text={t("useDraft")} icon={<Check aria-hidden="true" size={16} />} onClick={useDraft} data-testid="review-ai-use-draft" />{draftUsed ? <span className="text-sm text-[var(--blab-color-success)]" role="status" data-testid="review-ai-draft-used">{t("draftUsed")}</span> : null}</div>
          </div> : null}
        </ConsumerCard>

        <ConsumerCard className="mt-6" data-testid="review-share-card">
          <div className="flex items-start gap-3">
            <Link2 aria-hidden="true" className="mt-0.5 text-[var(--blab-color-primary)]" size={21} />
            <div>
              <h2 className="text-xl font-semibold">{t("shareTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("shareDescription")}</p>
            </div>
          </div>
          <a href={canonicalUrl} className="mt-5 block break-all rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface)] p-3 text-sm text-[var(--blab-color-primary)] underline-offset-4 hover:underline" data-testid="review-canonical-url">{canonicalUrl}</a>
          <div className="mt-4 flex flex-wrap gap-3">
            <ConsumerButton type="button" variant="primary" text={t("share")} icon={<Link2 aria-hidden="true" size={16} />} onClick={() => void handleShare()} data-testid="review-share" />
            <ConsumerButton type="button" variant="secondary" text={t("copy")} icon={<Clipboard aria-hidden="true" size={16} />} onClick={() => void handleCopy()} data-testid="review-copy" />
            <ConsumerButton type="button" variant="secondary" text={t("download")} icon={<Download aria-hidden="true" size={16} />} onClick={downloadCard} data-testid="review-download" />
          </div>
          {shareStatus === "native" ? <p className="mt-4 text-sm text-[var(--blab-color-success)]" role="status" data-testid="review-share-status">{t("shareNative")}</p> : null}
          {shareStatus === "clipboard" ? <p className="mt-4 text-sm text-[var(--blab-color-success)]" role="status" data-testid="review-share-status">{t("shareCopied")}</p> : null}
          {shareStatus === "download" ? <p className="mt-4 text-sm text-[var(--blab-color-success)]" role="status" data-testid="review-share-status">{t("shareDownloaded")}</p> : null}
          {shareStatus === "cancelled" ? <p className="mt-4 text-sm text-[var(--blab-text-tertiary)]" role="status" data-testid="review-share-status">{t("shareCancelled")}</p> : null}
        </ConsumerCard>
      </main>
    </div>
  );
}
