"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Clipboard,
  History,
  LoaderCircle,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { ConsumerNotice } from "@/components/consumer/consumer-notice";
import type { ConsumerLocale } from "@/lib/consumer/paths";
import {
  RecallDeleteHistoryResponseSchema,
  RecallHistoryPageSchema,
  RecallSearchResponseSchema,
  RecallSourceImageResponseSchema,
  type RecallSearchHistory,
  type RecallSearchResult,
  type RecallSource,
} from "@/lib/product/contracts";

type RecallClientProps = Readonly<{
  locale: ConsumerLocale;
  bookId?: string;
  onClose?: () => void;
}>;

type RequestError = Readonly<{ code: string; message: string }>;
type RequestState =
  | { phase: "loading" }
  | { phase: "ready" }
  | { phase: "error"; error: RequestError };

function readError(body: unknown, status: number): RequestError {
  if (typeof body === "object" && body !== null && "error" in body) {
    const error = (body as { error?: { code?: unknown; message?: unknown } }).error;
    if (typeof error?.code === "string" && typeof error.message === "string") {
      return { code: error.code, message: error.message };
    }
  }
  return { code: status === 401 ? "unauthorized" : "offline", message: "Recall request failed." };
}

function errorFromCaught(value: unknown): RequestError {
  if (typeof value === "object" && value !== null && "code" in value) {
    const error = value as { code?: unknown; message?: unknown };
    if (typeof error.code === "string" && typeof error.message === "string") {
      return { code: error.code, message: error.message };
    }
  }
  return { code: typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error", message: "Recall request failed." };
}

function dateLabel(value: string | null, locale: ConsumerLocale): string {
  if (!value) return "";
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

async function copyText(value: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
    }
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
}

export function RecallClient({ locale, bookId, onClose }: RecallClientProps) {
  const t = useTranslations("consumer");
  const scope = bookId ? "book" : "global";
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<RecallSearchResult | null>(null);
  const [history, setHistory] = useState<RecallSearchHistory[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [state, setState] = useState<RequestState>({ phase: "loading" });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedSource, setSelectedSource] = useState<RecallSource | null>(null);
  const [sourceImage, setSourceImage] = useState<{ url: string; expiresAt: string } | null>(null);
  const [sourceImageState, setSourceImageState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const inputTestId = bookId ? "book-recall-input" : "library-recall-input";
  const submitTestId = bookId ? "book-recall-submit" : "library-recall-submit";
  const panelTestId = bookId ? "book-recall-panel" : "library-recall-panel";
  const testPrefix = bookId ? "book-recall" : "library-recall";

  const historyUrl = useMemo(() => {
    const params = new URLSearchParams({ locale, limit: "10" });
    if (bookId) params.set("bookId", bookId);
    return `/api/consumer/recall?${params.toString()}`;
  }, [bookId, locale]);

  useEffect(() => {
    const sequence = ++requestSequence.current;
    const controller = new AbortController();
    setState({ phase: "loading" });
    setResult(null);
    void fetch(historyUrl, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) throw readError(body, response.status);
        const parsed = RecallHistoryPageSchema.safeParse(body);
        if (!parsed.success) throw { code: "error", message: "Recall history is malformed." };
        if (sequence !== requestSequence.current) return;
        setHistory(parsed.data.history);
        setSuggestions(parsed.data.suggestions);
        setState({ phase: "ready" });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || sequence !== requestSequence.current) return;
        setState({ phase: "error", error: errorFromCaught(error) });
      });
    return () => controller.abort();
  }, [historyUrl]);

  useEffect(() => {
    setSourceImage(null);
    setSourceImageState("idle");
    if (!selectedSource || selectedSource.type !== "photo_ocr" || !selectedSource.bookId || !selectedSource.sourceId) return;
    const controller = new AbortController();
    setSourceImageState("loading");
    const params = new URLSearchParams({ locale, bookId: selectedSource.bookId, sourceId: selectedSource.sourceId });
    void fetch(`/api/consumer/recall/source?${params.toString()}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) throw readError(body, response.status);
        const parsed = RecallSourceImageResponseSchema.safeParse(body);
        if (!parsed.success) throw { code: "error", message: "The source image is malformed." };
        setSourceImage({ url: parsed.data.signedUrl, expiresAt: parsed.data.expiresAt });
        setSourceImageState("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setSourceImageState(errorFromCaught(error).code === "offline" ? "error" : "error");
      });
    return () => controller.abort();
  }, [locale, selectedSource]);

  async function searchRecall(nextQuery: string) {
    const trimmed = nextQuery.trim();
    if (!trimmed || state.phase === "loading") return;
    const sequence = ++requestSequence.current;
    setQuery(trimmed);
    setState({ phase: "loading" });
    setResult(null);
    try {
      const response = await fetch("/api/consumer/recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "search",
          locale,
          query: trimmed,
          ...(bookId ? { bookId } : {}),
          pagination: { limit: 10 },
        }),
        cache: "no-store",
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw readError(body, response.status);
      const parsed = RecallSearchResponseSchema.safeParse(body);
      if (!parsed.success) throw { code: "error", message: "Recall search is malformed." };
      if (sequence !== requestSequence.current) return;
      setResult(parsed.data.result);
      setState({ phase: "ready" });
    } catch (error) {
      if (sequence !== requestSequence.current) return;
      setState({ phase: "error", error: errorFromCaught(error) });
    }
  }

  async function deleteHistory(historyId: string) {
    if (deletingId) return;
    setDeletingId(historyId);
    try {
      const response = await fetch("/api/consumer/recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_history", locale, historyId, ...(bookId ? { bookId } : {}) }),
        cache: "no-store",
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw readError(body, response.status);
      const parsed = RecallDeleteHistoryResponseSchema.safeParse(body);
      if (!parsed.success) throw { code: "error", message: "History deletion is malformed." };
      setHistory((current) => current.filter((item) => item.id !== parsed.data.historyId));
      setSuggestions((current) => current.filter((item) => history.find((entry) => entry.id === historyId)?.query !== item));
    } catch (error) {
      setState({ phase: "error", error: errorFromCaught(error) });
    } finally {
      setDeletingId(null);
    }
  }

  async function copy(value: string) {
    if (await copyText(value)) {
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1_500);
    }
  }

  function renderError(error: RequestError) {
    const content = error.code === "unauthorized"
      ? { testId: "recall-unauthorized", title: t("library.unauthorized.title"), description: t("library.unauthorized.description"), action: <Link href={`/${locale}/auth/sign-in`} className="inline-flex min-h-11 items-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white">{t("library.unauthorized.action")}</Link> }
      : error.code === "consent_required"
        ? { testId: "recall-consent", title: t("library.consent.title"), description: t("recall.states.consent"), action: <Link href={`/${locale}/account`} className="inline-flex min-h-11 items-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white">{t("library.consent.action")}</Link> }
        : error.code === "quota_exceeded"
          ? { testId: "recall-quota", title: t("library.quota.title"), description: t("recall.states.quota"), action: <Link href={`/${locale}/account`} className="inline-flex min-h-11 items-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white">{t("library.quota.action")}</Link> }
          : error.code === "provider_error" || error.code === "provider_timeout" || error.code === "timeout"
            ? { testId: "recall-provider", title: t("recall.states.providerTitle"), description: t("recall.states.provider"), action: <button type="button" onClick={() => void searchRecall(query)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white"><RefreshCw aria-hidden="true" size={16} />{t("library.error.retry")}</button> }
            : error.code === "offline"
              ? { testId: "recall-offline", title: t("recall.states.offlineTitle"), description: t("recall.states.offline"), action: <button type="button" onClick={() => void searchRecall(query)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white"><RefreshCw aria-hidden="true" size={16} />{t("library.error.retry")}</button> }
              : { testId: "recall-error", title: t("library.error.title"), description: t("recall.states.error"), action: <button type="button" onClick={() => void searchRecall(query)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white"><RefreshCw aria-hidden="true" size={16} />{t("library.error.retry")}</button> };
    return <div data-testid={bookId ? content.testId : content.testId.replace("recall-", "library-")}><ConsumerNotice tone="error" title={content.title} description={content.description} action={content.action} /></div>;
  }

  function sourceLabel(source: RecallSource): string {
    return t(`recall.sourceTypes.${source.type}`);
  }

  function renderSource(source: RecallSource, index: number) {
    return (
      <button
        key={`${source.sourceId ?? "source"}-${index}`}
        type="button"
        data-testid="recall-source-card"
        data-source-type={source.type}
        onClick={() => setSelectedSource(source)}
        className="flex min-h-14 w-full items-start gap-3 rounded-xl bg-[var(--blab-glass-fill)] p-3 text-left transition hover:bg-[var(--blab-surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]"
      >
        <span aria-hidden="true" className="mt-0.5 text-base">{source.type === "highlight" ? "✨" : source.type === "note" ? "📝" : "📷"}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-[var(--blab-color-primary)]">{sourceLabel(source)}</span>
          <span className="mt-1 block line-clamp-3 text-sm leading-6">{source.content}</span>
          <span className="mt-1 block text-xs text-[var(--blab-text-tertiary)]">{source.pageNumber ? `p.${source.pageNumber} · ` : ""}{dateLabel(source.createdAt, locale)}</span>
        </span>
        <ChevronRight aria-hidden="true" size={16} className="mt-1 shrink-0 text-[var(--blab-text-tertiary)]" />
      </button>
    );
  }

  function renderSources() {
    if (!result || result.sources.length === 0) return null;
    const entries = Object.entries(result.sourcesByBook ?? {});
    const groups = entries.length > 0
      ? entries
      : [["ungrouped", result.sources] as const];
    return (
      <section data-testid={`${testPrefix}-sources`} className="grid gap-3">
        <h3 className="text-sm font-semibold">{t("library.recall.sources")}</h3>
        {groups.map(([groupId, sources]) => {
          const expanded = expandedGroups[groupId] ?? true;
          const book = sources[0];
          return (
            <div key={groupId} data-testid={`${testPrefix}-source-group`} className="rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-4">
              <div className="flex items-center justify-between gap-3">
                <button type="button" data-testid="recall-source-group-toggle" aria-expanded={expanded} onClick={() => setExpandedGroups((current) => ({ ...current, [groupId]: !expanded }))} className="inline-flex min-h-10 min-w-0 items-center gap-2 text-left font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]">
                  {expanded ? <ChevronDown aria-hidden="true" size={17} /> : <ChevronRight aria-hidden="true" size={17} />}
                  <span className="truncate">{book?.bookTitle ?? t("library.openBook")}</span>
                </button>
                {book?.bookId ? <Link href={`/${locale}/books/${book.bookId}`} data-testid="recall-source-group-book" className="shrink-0 text-xs text-[var(--blab-color-primary)]">{t("library.openBook")}</Link> : null}
              </div>
              {expanded ? <div className="mt-3 grid gap-2" data-testid="recall-source-list">{sources.map(renderSource)}</div> : null}
            </div>
          );
        })}
      </section>
    );
  }

  function renderResult() {
    if (!result) return null;
    const isEmpty = result.answer.trim().length === 0 && result.sources.length === 0;
    if (isEmpty) return <div data-testid={`${testPrefix}-empty`}><ConsumerNotice title={t("library.recall.empty")} description={t("library.recall.emptyDescription")} /></div>;
    return (
      <div className="grid gap-5" data-testid={`${testPrefix}-result`}>
        <article data-testid={`${testPrefix}-answer`} className="rounded-2xl border border-[var(--blab-color-primary)]/30 bg-[var(--blab-color-primary)]/10 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--blab-color-primary)]"><Sparkles aria-hidden="true" size={17} />{t("library.recall.answer")}</div>
            <button type="button" data-testid="recall-answer-copy" onClick={() => void copy(result.answer)} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs text-[var(--blab-text-secondary)] hover:bg-[var(--blab-glass-fill)]"><Clipboard aria-hidden="true" size={14} />{copyState === "copied" ? t("recall.copied") : t("recall.copy")}</button>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{result.answer || t("library.recall.empty")}</p>
        </article>
        {renderSources()}
        <button type="button" data-testid={`${testPrefix}-new-search`} onClick={() => setResult(null)} className="justify-self-start text-sm font-semibold text-[var(--blab-color-primary)]">{t("library.recall.newSearch")}</button>
      </div>
    );
  }

  return (
    <section data-testid={panelTestId} data-recall-scope={scope} className="grid gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
        <p className="text-sm font-medium text-[var(--blab-color-primary)]">{t("library.recall.eyebrow")}</p>
        <h2 className="mt-2 text-2xl font-semibold">{bookId ? t("recall.bookTitle") : t("library.recall.title")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--blab-text-tertiary)]">{bookId ? t("recall.bookDescription") : t("library.recall.description")}</p>
        </div>
        {onClose ? <button type="button" onClick={onClose} data-testid="library-recall-close" aria-label={t("library.recallClose")} className="grid min-h-11 min-w-11 place-items-center rounded-full border border-[var(--blab-glass-border)] hover:bg-[var(--blab-glass-fill)]"><X aria-hidden="true" size={20} /></button> : null}
      </div>
      <form onSubmit={(event) => { event.preventDefault(); void searchRecall(query); }} className="flex gap-2">
        <label className="sr-only" htmlFor={inputTestId}>{t("library.recall.inputLabel")}</label>
        <div className="relative min-w-0 flex-1">
          <Sparkles aria-hidden="true" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--blab-color-primary)]" />
          <input id={inputTestId} data-testid={inputTestId} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("library.recall.inputPlaceholder")} className="min-h-12 w-full rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] pl-11 pr-4 text-sm outline-none focus:border-[var(--blab-color-primary)] focus:ring-2 focus:ring-[var(--blab-color-primary)]" />
        </div>
        <button type="submit" data-testid={submitTestId} disabled={!query.trim() || state.phase === "loading"} className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-2xl bg-[var(--blab-color-primary)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]"><Search aria-hidden="true" size={17} />{state.phase === "loading" ? t("library.recall.searching") : t("library.recall.submit")}</button>
      </form>
      {state.phase === "loading" ? <div data-testid="recall-loading" className="grid min-h-52 place-items-center rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)]"><span className="inline-flex items-center gap-2 text-sm text-[var(--blab-text-tertiary)]"><LoaderCircle aria-hidden="true" className="animate-spin" size={18} />{t("library.recall.searching")}</span></div> : null}
      {state.phase === "error" ? renderError(state.error) : null}
      {state.phase === "ready" && result ? renderResult() : null}
      {state.phase === "ready" && !result ? (
        <div data-testid={`${testPrefix}-history`} className="grid gap-4">
          {suggestions.length > 0 ? <section className="grid gap-2" data-testid="recall-suggestions"><h3 className="text-sm font-semibold">{t("recall.suggestions")}</h3><div className="flex flex-wrap gap-2">{suggestions.map((suggestion) => <button key={suggestion} type="button" data-testid="recall-suggestion" onClick={() => void searchRecall(suggestion)} className="rounded-full border border-[var(--blab-glass-border)] px-3 py-2 text-sm hover:bg-[var(--blab-glass-fill)]">{suggestion}</button>)}</div></section> : null}
          <section className="grid gap-3"><h3 className="text-sm font-semibold">{bookId ? t("recall.bookHistory") : t("library.recall.history")}</h3>{history.length > 0 ? history.map((item) => <div key={item.id} data-testid={`${testPrefix}-history-item`} className="flex min-h-14 items-center gap-2 rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-2"><button type="button" onClick={() => void searchRecall(item.query)} className="flex min-h-10 min-w-0 flex-1 items-center gap-3 rounded-xl p-2 text-left hover:bg-[var(--blab-glass-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]"><History aria-hidden="true" size={18} className="shrink-0 text-[var(--blab-text-tertiary)]" /><span className="min-w-0 flex-1 truncate text-sm">{item.query}</span><ChevronRight aria-hidden="true" size={16} className="shrink-0 text-[var(--blab-text-tertiary)]" /></button><button type="button" aria-label={t("recall.deleteHistory")} data-testid={`${testPrefix}-history-delete`} disabled={deletingId === item.id} onClick={() => void deleteHistory(item.id)} className="grid min-h-10 min-w-10 place-items-center rounded-xl text-[var(--blab-text-tertiary)] hover:bg-red-400/10 hover:text-red-200 disabled:opacity-50"><Trash2 aria-hidden="true" size={16} /></button></div>) : <ConsumerNotice title={t("library.empty.recallTitle")} description={t("library.empty.recallDescription")} />}</section>
        </div>
      ) : null}
      {selectedSource ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedSource(null); }}><div role="dialog" aria-modal="true" aria-labelledby="recall-source-detail-title" data-testid="recall-source-detail" className="w-full max-w-lg rounded-3xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-elevated)] p-6 shadow-[var(--blab-elevation-surface)]"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-[var(--blab-color-primary)]">{sourceLabel(selectedSource)}</p><h2 id="recall-source-detail-title" className="mt-1 text-xl font-semibold">{selectedSource.bookTitle ?? t("recall.recordDetail")}</h2></div><button type="button" aria-label={t("recall.closeDetail")} data-testid="recall-source-detail-close" onClick={() => setSelectedSource(null)} className="grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-[var(--blab-glass-fill)]"><X aria-hidden="true" size={20} /></button></div>{selectedSource.type === "photo_ocr" ? <div className="mt-5" data-testid="recall-source-image-view">{sourceImageState === "loading" ? <div data-testid="recall-source-image-loading" className="grid min-h-36 place-items-center rounded-2xl bg-[var(--blab-glass-fill)]"><LoaderCircle aria-hidden="true" className="animate-spin" size={18} /></div> : null}{sourceImageState === "ready" && sourceImage ? <img src={sourceImage.url} alt={t("recall.imageAlt")} data-testid="recall-source-image" className="max-h-72 w-full rounded-2xl object-contain" /> : null}{sourceImageState === "error" ? <p data-testid="recall-source-image-error" className="rounded-xl bg-amber-400/10 px-4 py-3 text-sm">{t("recall.imageUnavailable")}</p> : null}</div> : null}<div className="mt-5 flex items-center justify-between gap-3"><span className="text-xs text-[var(--blab-text-tertiary)]">{selectedSource.pageNumber ? `p.${selectedSource.pageNumber} · ` : ""}{dateLabel(selectedSource.createdAt, locale)}</span><button type="button" data-testid="recall-source-copy" onClick={() => void copy(selectedSource.content)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--blab-glass-border)] px-3 text-sm hover:bg-[var(--blab-glass-fill)]"><Clipboard aria-hidden="true" size={15} />{copyState === "copied" ? t("recall.copied") : t("recall.copy")}</button></div><p className="mt-4 whitespace-pre-wrap text-sm leading-7" data-testid="recall-source-text">{selectedSource.content}</p>{selectedSource.bookId ? <Link href={`/${locale}/books/${selectedSource.bookId}`} data-testid="recall-source-go-to-book" onClick={() => setSelectedSource(null)} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white"><ChevronRight aria-hidden="true" size={17} />{t("recall.goToBook")}</Link> : null}</div></div> : null}
    </section>
  );
}
