"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  LoaderCircle,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { ConsumerNotice } from "@/components/consumer/consumer-notice";
import { NetworkStatus } from "@/components/consumer/network-status";
import { RecallClient } from "@/components/consumer/recall-client";
import type { ConsumerLocale } from "@/lib/consumer/paths";
import {
  buildLibraryApiUrl,
  getLibraryTab,
  groupRecordsByBook,
  isAbortError,
  mergeById,
  parseLibraryPayload,
  type LibraryPayload,
  type LibraryViewTab,
} from "@/lib/consumer/library";
import type { Book, ReadingRecord } from "@/lib/product/contracts";

type LoadState =
  | { phase: "loading" }
  | { phase: "loading-more" }
  | { phase: "ready" }
  | { phase: "error"; code: string; message: string };

const emptyPayload = (tab: LibraryPayload["tab"]): LibraryPayload => ({
  tab,
  books: [],
  records: [],
  history: [],
  recall: null,
  pageInfo: { nextCursor: null, hasMore: false },
  counts: { reading: 0, review: 0, records: 0 },
});

function dateLabel(value: string, locale: ConsumerLocale): string {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function errorFromResponse(body: unknown, status: number): { code: string; message: string } {
  if (typeof body === "object" && body !== null && "error" in body) {
    const error = (body as { error?: { code?: unknown; message?: unknown } }).error;
    if (error && typeof error.code === "string" && typeof error.message === "string") {
      return { code: error.code, message: error.message };
    }
  }
  return { code: status === 401 ? "unauthorized" : "unavailable", message: "Request failed." };
}

function statusLabel(book: Book, t: (key: string) => string): string {
  if (book.status === "planned") return t("book.status.planned");
  if (book.status === "completed") return t("book.status.completed");
  if (book.status === "will_retry") return t("book.status.will_retry");
  return t("book.status.reading");
}

export function LibraryClient({
  locale,
  initialTab,
  initialRecall = false,
}: {
  locale: ConsumerLocale;
  initialTab?: LibraryViewTab;
  initialRecall?: boolean;
}) {
  const t = useTranslations("consumer");
  const [activeTab, setActiveTab] = useState<LibraryPayload["tab"]>(initialRecall ? "recall" : getLibraryTab(initialTab));
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [recordType, setRecordType] = useState<"highlight" | "note" | "photo_ocr" | null>(null);
  const [payload, setPayload] = useState<LibraryPayload>(() => emptyPayload(initialRecall ? "recall" : getLibraryTab(initialTab)));
  const [loadState, setLoadState] = useState<LoadState>({ phase: "loading" });
  const [retryKey, setRetryKey] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<ReadingRecord | null>(null);
  const requestSequence = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    if (activeTab === "recall") return;
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [activeTab, search]);

  const replaceUrl = useCallback((tab: LibraryPayload["tab"]) => {
    const params = new URLSearchParams();
    if (tab === "recall") {
      params.set("view", "records");
      params.set("mode", "recall");
    } else if (tab !== "reading") {
      params.set("tab", tab);
    }
    const suffix = params.toString();
    window.history.replaceState(window.history.state, "", `/${locale}/library${suffix ? `?${suffix}` : ""}`);
  }, [locale]);

  const loadPage = useCallback(async (cursor: string | null, append: boolean) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const sequence = ++requestSequence.current;
    if (append) setLoadState({ phase: "loading-more" });
    else setLoadState({ phase: "loading" });

    try {
      const requestQuery = debouncedSearch;
      const result = await fetch(buildLibraryApiUrl({
        locale,
        tab: activeTab,
        query: requestQuery,
        cursor,
        limit: 2,
        recordType,
      }), { signal: controller.signal, cache: "no-store" });
      const body: unknown = await result.json().catch(() => null);
      if (!result.ok) {
        const error = errorFromResponse(body, result.status);
        throw Object.assign(new Error(error.message), { code: error.code });
      }
      const next = parseLibraryPayload(body);
      if (!next) throw Object.assign(new Error("Invalid library response."), { code: "unavailable" });
      if (controller.signal.aborted || sequence !== requestSequence.current) return;
      setPayload((current) => append
        ? { ...next, books: mergeById(current.books, next.books), records: mergeById(current.records, next.records) }
        : next);
      setLoadState({ phase: "ready" });
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error) || sequence !== requestSequence.current) return;
      const typed = error as Error & { code?: string };
      setLoadState({ phase: "error", code: typed.code ?? "offline", message: typed.message });
    }
  }, [activeTab, debouncedSearch, locale, recordType]);

  useEffect(() => {
    if (activeTab === "recall") return;
    void loadPage(null, false);
    return () => activeRequest.current?.abort();
  }, [activeTab, loadPage, retryKey]);

  function selectTab(tab: LibraryViewTab) {
    activeRequest.current?.abort();
    setActiveTab(tab);
    setSearch("");
    setDebouncedSearch("");
    setRecordType(null);
    setPayload(emptyPayload(tab));
    setLoadState({ phase: "loading" });
    replaceUrl(tab);
  }

  function openRecall() {
    activeRequest.current?.abort();
    setActiveTab("recall");
    setPayload(emptyPayload("recall"));
    setLoadState({ phase: "loading" });
    replaceUrl("recall");
  }

  const recordGroups = useMemo(() => groupRecordsByBook(payload.records), [payload.records]);
  const tabLabels: Record<LibraryViewTab, string> = {
    reading: t("library.tabs.reading"),
    review: t("library.tabs.review"),
    records: t("library.tabs.records"),
  };
  const visibleBookEmpty = activeTab === "review" ? "review" : "reading";

  function renderBook(book: Book) {
    const review = book.longReview?.trim() || book.review?.trim();
    return (
      <Link
        key={book.id}
        href={`/${locale}/books/${book.id}`}
        data-testid="library-book"
        data-book-id={book.id}
        data-book-title={book.title}
        className="group rounded-[var(--blab-radius-card)] border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--blab-color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{book.title}</h3>
            <p className="mt-1 truncate text-sm text-[var(--blab-text-tertiary)]">{book.author || t("library.authorUnknown")}</p>
          </div>
          <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-[var(--blab-text-tertiary)] transition group-hover:text-[var(--blab-color-primary)]" />
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 text-xs text-[var(--blab-text-tertiary)]">
          <span className="rounded-full bg-[var(--blab-glass-fill)] px-3 py-1">{statusLabel(book, t)}</span>
          <span>{book.totalPages > 0 ? `${book.currentPage}/${book.totalPages} ${t("book.pages")}` : t("library.openBook")}</span>
        </div>
        {review ? <p className="mt-4 line-clamp-2 text-sm leading-6 text-[var(--blab-text-secondary)]">{review}</p> : null}
      </Link>
    );
  }

  function renderRecords() {
    return (
      <div className="grid gap-4" data-testid="library-records">
        {recordGroups.map((group) => (
          <section key={group.bookId} data-testid="library-record-group" className="rounded-[var(--blab-radius-card)] border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-semibold">{group.bookTitle}</h3>
                <p className="mt-1 text-xs text-[var(--blab-text-tertiary)]">{t("library.records.count", { count: group.records.length })}</p>
              </div>
              <ChevronDown aria-hidden="true" size={18} className="shrink-0 text-[var(--blab-text-tertiary)]" />
            </div>
            <div className="mt-4 grid gap-2">
              {group.records.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  data-testid="library-record"
                  onClick={() => setSelectedRecord(record)}
                  className="flex min-h-14 items-start gap-3 rounded-xl bg-[var(--blab-glass-fill)] p-3 text-left transition hover:bg-[var(--blab-surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]"
                >
                  <span aria-hidden="true" className="mt-0.5 text-base">{record.contentType === "highlight" ? "✨" : record.contentType === "note" ? "📝" : "📷"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block line-clamp-2 text-sm leading-6">{record.contentText}</span>
                    <span className="mt-1 block text-xs text-[var(--blab-text-tertiary)]">{record.pageNumber ? `p.${record.pageNumber} · ` : ""}{dateLabel(record.createdAt, locale)}</span>
                  </span>
                  <ChevronRight aria-hidden="true" size={16} className="mt-1 shrink-0 text-[var(--blab-text-tertiary)]" />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  function renderRecall() {
    return <RecallClient locale={locale} onClose={() => selectTab("reading")} />;
  }

  function renderError(error: Extract<LoadState, { phase: "error" }>) {
    if (error.code === "unauthorized") {
      return <div data-testid="library-unauthorized"><ConsumerNotice tone="error" title={t("library.unauthorized.title")} description={t("library.unauthorized.description")} action={<Link href={`/${locale}/auth/sign-in`} className="inline-flex min-h-11 items-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white">{t("library.unauthorized.action")}</Link>} /></div>;
    }
    if (error.code === "consent_required") {
      return <div data-testid="library-consent"><ConsumerNotice tone="error" title={t("library.consent.title")} description={t("library.consent.description")} action={<Link href={`/${locale}/account`} className="inline-flex min-h-11 items-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white">{t("library.consent.action")}</Link>} /></div>;
    }
    if (error.code === "quota_exceeded") {
      return <div data-testid="library-quota"><ConsumerNotice tone="error" title={t("library.quota.title")} description={t("library.quota.description")} action={<Link href={`/${locale}/account`} className="inline-flex min-h-11 items-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white">{t("library.quota.action")}</Link>} /></div>;
    }
    return <div data-testid="library-error"><ConsumerNotice tone="error" title={t("library.error.title")} description={error.code === "offline" ? t("library.states.offline") : t("library.error.description")} action={<button type="button" data-testid="library-retry" onClick={() => setRetryKey((key) => key + 1)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white"><RefreshCw aria-hidden="true" size={16} />{t("library.error.retry")}</button>} /></div>;
  }

  function renderMainContent() {
    if (activeTab === "recall") return renderRecall();
    if (loadState.phase === "error") return renderError(loadState);
    if (loadState.phase === "loading" && payload.books.length === 0 && payload.records.length === 0 && !payload.recall) {
      return <div data-testid="library-loading" className="grid min-h-64 place-items-center rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)]"><span className="inline-flex items-center gap-2 text-sm text-[var(--blab-text-tertiary)]"><LoaderCircle aria-hidden="true" className="animate-spin" size={18} />{t("library.loading")}</span></div>;
    }
    if (activeTab === "records") {
      if (payload.records.length === 0 && loadState.phase === "ready") return <div data-testid="library-empty"><ConsumerNotice title={t("library.empty.recordsTitle")} description={t("library.empty.recordsDescription")} /></div>;
      return <>{renderRecords()}{payload.pageInfo.hasMore ? <button type="button" data-testid="library-load-more" onClick={() => void loadPage(payload.pageInfo.nextCursor, true)} disabled={loadState.phase === "loading-more"} className="mx-auto mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--blab-glass-border)] px-4 text-sm font-semibold hover:bg-[var(--blab-glass-fill)] disabled:opacity-50">{loadState.phase === "loading-more" ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : null}{loadState.phase === "loading-more" ? t("library.loadingMore") : t("library.loadMore")}</button> : null}</>;
    }
    if (payload.books.length === 0 && loadState.phase === "ready") {
      return <div data-testid="library-empty"><ConsumerNotice title={t(`library.empty.${visibleBookEmpty}Title`)} description={t(`library.empty.${visibleBookEmpty}Description`)} action={<Link href={`/${locale}/books/new`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white"><BookOpen aria-hidden="true" size={17} />{t("library.addBook")}</Link>} /></div>;
    }
    return <>{<div data-testid="library-books" className="grid gap-4 md:grid-cols-2">{payload.books.map(renderBook)}</div>}{payload.pageInfo.hasMore ? <button type="button" data-testid="library-load-more" onClick={() => void loadPage(payload.pageInfo.nextCursor, true)} disabled={loadState.phase === "loading-more"} className="mx-auto mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--blab-glass-border)] px-4 text-sm font-semibold hover:bg-[var(--blab-glass-fill)] disabled:opacity-50">{loadState.phase === "loading-more" ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : null}{loadState.phase === "loading-more" ? t("library.loadingMore") : t("library.loadMore")}</button> : null}</>;
  }

  return (
    <div className="bookgolas-consumer-page min-h-screen bg-[var(--blab-surface-scaffold)] text-[var(--blab-text-primary)]" data-testid="library-page" data-route-state={loadState.phase === "error" ? "error" : loadState.phase === "loading" ? "loading" : "ready"}>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {activeTab === "recall" ? renderRecall() : <>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-sm font-medium text-[var(--blab-color-primary)]">{t("library.eyebrow")}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{t("library.title")}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("library.description")}</p></div>
            <div className="flex flex-wrap gap-3"><button type="button" data-testid="library-recall-open" onClick={openRecall} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--blab-glass-border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--blab-glass-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]"><Sparkles aria-hidden="true" size={17} />{t("library.recallOpen")}</button><Link href={`/${locale}/books/new`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white"><BookOpen aria-hidden="true" size={17} />{t("library.addBook")}</Link></div>
          </div>
          <div className="mt-6"><NetworkStatus /></div>
          <div className="mt-8 grid gap-6">
            <div role="tablist" aria-label={t("library.tabs.label")} data-testid="library-tabs" className="grid grid-cols-3 gap-2 rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-2">
              {(["reading", "review", "records"] as const).map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} data-testid={`library-tab-${tab}`} onClick={() => selectTab(tab)} className={`min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)] ${activeTab === tab ? "bg-[var(--blab-color-primary)] text-white" : "text-[var(--blab-text-secondary)] hover:bg-[var(--blab-glass-fill)]"}`}>{tabLabels[tab]} ({payload.counts[tab]})</button>)}
            </div>
            {activeTab === "records" ? <div data-testid="library-record-filters" className="flex flex-wrap gap-2">{([null, "highlight", "note", "photo_ocr"] as const).map((type) => <button key={type ?? "all"} type="button" data-testid={`library-record-filter-${type ?? "all"}`} onClick={() => setRecordType(type)} aria-pressed={recordType === type} className={`min-h-10 rounded-full border px-4 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)] ${recordType === type ? "border-[var(--blab-color-primary)] bg-[var(--blab-color-primary)] text-white" : "border-[var(--blab-glass-border)] hover:bg-[var(--blab-glass-fill)]"}`}>{type === null ? t("library.records.all") : t(`library.records.${type}`)}</button>)}</div> : <div className="relative"><Search aria-hidden="true" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--blab-text-tertiary)]" /><label className="sr-only" htmlFor="library-search">{t("library.searchLabel")}</label><input id="library-search" data-testid="library-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("library.searchPlaceholder")} className="min-h-12 w-full rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] pl-11 pr-4 text-sm outline-none focus:border-[var(--blab-color-primary)] focus:ring-2 focus:ring-[var(--blab-color-primary)]" /></div>}
            <div data-testid="library-content" aria-busy={loadState.phase === "loading" || loadState.phase === "loading-more"}>{renderMainContent()}</div>
          </div>
        </>}
        {selectedRecord ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedRecord(null); }}><div role="dialog" aria-modal="true" aria-labelledby="library-record-detail-title" data-testid="library-record-detail" className="w-full max-w-lg rounded-3xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-elevated)] p-6 shadow-[var(--blab-elevation-surface)]"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-[var(--blab-color-primary)]">{t("library.records.detailTitle")}</p><h2 id="library-record-detail-title" className="mt-1 text-xl font-semibold">{selectedRecord.bookTitle}</h2></div><button type="button" aria-label={t("library.records.close")} onClick={() => setSelectedRecord(null)} className="grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-[var(--blab-glass-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]"><X aria-hidden="true" size={20} /></button></div><p className="mt-6 whitespace-pre-wrap text-sm leading-7">{selectedRecord.contentText}</p><p className="mt-4 text-xs text-[var(--blab-text-tertiary)]">{selectedRecord.pageNumber ? `p.${selectedRecord.pageNumber} · ` : ""}{dateLabel(selectedRecord.createdAt, locale)}</p><Link href={`/${locale}/books/${selectedRecord.bookId}`} onClick={() => setSelectedRecord(null)} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white"><ChevronRight aria-hidden="true" size={17} />{t("library.records.goToBook")}</Link></div></div> : null}
      </main>
    </div>
  );
}
