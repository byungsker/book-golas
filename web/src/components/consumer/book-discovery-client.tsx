"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  BookOpen,
  Camera,
  Check,
  FileImage,
  LoaderCircle,
  Search,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { ConsumerNotice } from "@/components/consumer/consumer-notice";
import { BookLifecycleClient } from "@/components/consumer/book-lifecycle-client";
import {
  ConsumerButton,
  ConsumerCard,
  ConsumerLoadingState,
  ConsumerTextField,
} from "@/components/consumer/blab-primitives";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  BookRecommendation,
  BookSearchResult,
} from "@/lib/product/contracts";
import type { ProductError } from "@/lib/product/dal/errors";
import {
  isAbortError,
  parseBookDiscoveryResponse,
  readBookDiscoveryError,
  trustedRecommendationImage,
} from "@/lib/consumer/book-discovery";
import { isValidIsbn13, normalizeIsbn13 } from "@/lib/consumer/isbn";
import type { ConsumerLocale } from "@/lib/consumer/paths";

type SearchState = "idle" | "loading" | "ready" | "empty" | "error";
type RecommendationState = "loading" | "ready" | "empty" | "error";
type CameraState = "checking" | "ready" | "unsupported" | "insecure" | "denied";
type FileState = "idle" | "reading" | "detected" | "manual-fallback";

type BarcodeDetection = { readonly rawValue?: string };
type BarcodeDetectorLike = {
  detect(source: CanvasImageSource): Promise<BarcodeDetection[]>;
};
type BarcodeDetectorConstructorLike = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

function getBarcodeDetector(): BarcodeDetectorConstructorLike | null {
  const candidate = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructorLike }).BarcodeDetector;
  return candidate ?? null;
}

function errorKind(code: ProductError["code"]): "unauthorized" | "consent" | "quota" | "offline" | "upstream" | "invalid" {
  if (code === "unauthorized") return "unauthorized";
  if (code === "consent_required") return "consent";
  if (code === "quota_exceeded" || code === "rate_limited") return "quota";
  if (code === "offline") return "offline";
  if (code === "validation_error") return "invalid";
  return "upstream";
}

function imageAlt(book: BookSearchResult | BookRecommendation, t: (key: string) => string): string {
  return `${book.title} · ${book.author || t("bookDiscovery.result.authorUnknown")}`;
}

export function BookDiscoveryClient({
  locale,
  initialQuery = "",
}: {
  locale: ConsumerLocale;
  initialQuery?: string;
}) {
  const t = useTranslations("consumer");
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [manualIsbn, setManualIsbn] = useState("");
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [searchState, setSearchState] = useState<SearchState>(initialQuery ? "loading" : "idle");
  const [searchError, setSearchError] = useState<ProductError | null>(null);
  const [recommendations, setRecommendations] = useState<BookRecommendation[]>([]);
  const [recommendationState, setRecommendationState] = useState<RecommendationState>("loading");
  const [recommendationError, setRecommendationError] = useState<ProductError | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<BookRecommendation | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraState, setCameraState] = useState<CameraState>("checking");
  const [fileState, setFileState] = useState<FileState>("idle");
  const [isbnError, setIsbnError] = useState(false);
  const [isbnErrorMessage, setIsbnErrorMessage] = useState("");
  const searchRequest = useRef<AbortController | null>(null);
  const searchSequence = useRef(0);
  const recommendationRequest = useRef<AbortController | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanFrame = useRef<number | null>(null);
  const scheduledQuery = useRef("");
  const selectFirstResult = useRef(false);

  const stopCamera = useCallback(() => {
    if (scanFrame.current !== null) {
      window.cancelAnimationFrame(scanFrame.current);
      scanFrame.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const executeSearch = useCallback(async (rawQuery: string, mode: "text" | "isbn") => {
    const query = mode === "isbn" ? normalizeIsbn13(rawQuery) : rawQuery.trim();
    if (!query) {
      searchRequest.current?.abort();
      searchSequence.current += 1;
      setSearchResults([]);
      setSelectedBook(null);
      setSearchError(null);
      setSearchState("idle");
      return;
    }
    if (mode === "isbn" && !isValidIsbn13(query)) {
      searchRequest.current?.abort();
      searchSequence.current += 1;
      setSearchResults([]);
      setSelectedBook(null);
      setSearchError({ code: "validation_error", status: 400, message: "A valid ISBN-13 is required.", retryable: false });
      setSearchState("error");
      return;
    }

    searchRequest.current?.abort();
    const controller = new AbortController();
    searchRequest.current = controller;
    const sequence = ++searchSequence.current;
    setSearchState("loading");
    setSearchError(null);
    setSelectedBook(null);

    try {
      const response = await fetch("/api/consumer/book-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search", locale, mode, query }),
        signal: controller.signal,
        cache: "no-store",
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw readBookDiscoveryError(body, response.status);
      const parsed = parseBookDiscoveryResponse(body);
      if (!parsed || parsed.kind !== "search") {
        throw { code: "unavailable", status: 503, message: "Book discovery is temporarily unavailable.", retryable: true } satisfies ProductError;
      }
      if (controller.signal.aborted || sequence !== searchSequence.current) return;
      setSearchResults(parsed.books);
      setSelectedBook(selectFirstResult.current ? parsed.books[0] ?? null : null);
      selectFirstResult.current = false;
      setSearchState(parsed.books.length > 0 ? "ready" : "empty");
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error) || sequence !== searchSequence.current) return;
      const typed = (error && typeof error === "object" ? error : null) as ProductError | null;
      setSearchError(typed?.code ? typed : { code: "offline", status: 503, message: "Book discovery is offline.", retryable: true });
      setSearchState("error");
    }
  }, [locale]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const query = searchQuery.trim();
      if (!query) {
        void executeSearch("", "text");
        return;
      }
      if (scheduledQuery.current === query) return;
      scheduledQuery.current = query;
      void executeSearch(query, "text");
    }, 400);
    return () => window.clearTimeout(timer);
  }, [executeSearch, searchQuery]);

  useEffect(() => {
    const controller = new AbortController();
    recommendationRequest.current = controller;
    void (async () => {
      try {
        const response = await fetch("/api/consumer/book-discovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "recommendations", locale }),
          signal: controller.signal,
          cache: "no-store",
        });
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) throw readBookDiscoveryError(body, response.status);
        const parsed = parseBookDiscoveryResponse(body);
        if (!parsed || parsed.kind !== "recommendations") throw new Error("Invalid recommendations response.");
        if (controller.signal.aborted) return;
        if (!parsed.result.success || parsed.result.recommendations.length === 0) {
          setRecommendations([]);
          setRecommendationState("empty");
          return;
        }
        setRecommendations(parsed.result.recommendations);
        setRecommendationState("ready");
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) return;
        const typed = (error && typeof error === "object" ? error : null) as ProductError | null;
        setRecommendationError(typed?.code ? typed : { code: "unavailable", status: 503, message: "Recommendations are unavailable.", retryable: true });
        setRecommendationState("error");
      }
    })();
    return () => controller.abort();
  }, [locale]);

  useEffect(() => {
    if (!cameraOpen) {
      stopCamera();
      return;
    }

    let cancelled = false;
    const start = async () => {
      setCameraState("checking");
      if (!window.isSecureContext) {
        setCameraState("insecure");
        return;
      }
      const Detector = getBarcodeDetector();
      if (!Detector || !navigator.mediaDevices?.getUserMedia) {
        setCameraState("unsupported");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          setCameraState("unsupported");
          return;
        }
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        setCameraState("ready");
        const detector = new Detector({ formats: ["ean_13", "ean_8"] });
        const scan = async () => {
          if (cancelled || !videoRef.current) return;
          if (videoRef.current.readyState >= 2) {
            try {
              const detections = await detector.detect(videoRef.current);
              const value = detections.find((item) => item.rawValue)?.rawValue;
              if (value && isValidIsbn13(value)) {
                const isbn = normalizeIsbn13(value);
                setManualIsbn(isbn);
                setSearchQuery(isbn);
                scheduledQuery.current = isbn;
                selectFirstResult.current = true;
                setFileState("detected");
                setCameraOpen(false);
                void executeSearch(isbn, "isbn");
                return;
              }
            } catch {
              setCameraState("unsupported");
              return;
            }
          }
          if (!cancelled) scanFrame.current = window.requestAnimationFrame(() => void scan());
        };
        scanFrame.current = window.requestAnimationFrame(() => void scan());
      } catch (error) {
        if (cancelled) return;
        setCameraState(error instanceof DOMException && error.name === "NotAllowedError" ? "denied" : "unsupported");
      }
    };
    void start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [cameraOpen, executeSearch, stopCamera]);

  function requestTextSearch() {
    const query = searchQuery.trim();
    if (!query) return;
    scheduledQuery.current = query;
    void executeSearch(query, "text");
  }

  function submitTextSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    requestTextSearch();
  }

  function submitIsbnSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const isbn = normalizeIsbn13(manualIsbn);
    if (!isValidIsbn13(isbn)) {
      setIsbnError(true);
      setIsbnErrorMessage(t("bookDiscovery.isbn.invalid"));
      return;
    }
    setIsbnError(false);
    setIsbnErrorMessage("");
    setSearchQuery(isbn);
    scheduledQuery.current = isbn;
    selectFirstResult.current = true;
    void executeSearch(isbn, "isbn");
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFileState("reading");
    const Detector = getBarcodeDetector();
    if (!Detector || typeof createImageBitmap !== "function") {
      setFileState("manual-fallback");
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const detections = await new Detector({ formats: ["ean_13", "ean_8"] }).detect(bitmap);
      bitmap.close();
      const value = detections.find((item) => item.rawValue)?.rawValue;
      if (!value || !isValidIsbn13(value)) {
        setFileState("manual-fallback");
        return;
      }
      const isbn = normalizeIsbn13(value);
      setManualIsbn(isbn);
      setSearchQuery(isbn);
      scheduledQuery.current = isbn;
      selectFirstResult.current = true;
      setFileState("detected");
      void executeSearch(isbn, "isbn");
    } catch {
      setFileState("manual-fallback");
    }
  }

  function chooseRecommendation(recommendation: BookRecommendation, startReading: boolean) {
    setSelectedRecommendation(null);
    selectFirstResult.current = startReading;
    setSearchQuery(recommendation.title);
    scheduledQuery.current = "";
    window.setTimeout(() => document.getElementById("book-discovery-search")?.focus(), 0);
  }

  function retrySearch() {
    if (searchQuery.trim()) requestTextSearch();
  }

  function retryRecommendations() {
    recommendationRequest.current?.abort();
    setRecommendationState("loading");
    setRecommendationError(null);
    const controller = new AbortController();
    recommendationRequest.current = controller;
    void (async () => {
      try {
        const response = await fetch("/api/consumer/book-discovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "recommendations", locale }),
          signal: controller.signal,
          cache: "no-store",
        });
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) throw readBookDiscoveryError(body, response.status);
        const parsed = parseBookDiscoveryResponse(body);
        if (!parsed || parsed.kind !== "recommendations") throw new Error("Invalid recommendations response.");
        if (!parsed.result.success || parsed.result.recommendations.length === 0) {
          setRecommendations([]);
          setRecommendationState("empty");
          return;
        }
        setRecommendations(parsed.result.recommendations);
        setRecommendationState("ready");
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) return;
        const typed = (error && typeof error === "object" ? error : null) as ProductError | null;
        setRecommendationError(typed?.code ? typed : { code: "unavailable", status: 503, message: "Recommendations are unavailable.", retryable: true });
        setRecommendationState("error");
      }
    })();
  }

  function renderPolicyNotice(error: ProductError, scope: "search" | "recommendation") {
    const kind = errorKind(error.code);
    const prefix = scope === "search" ? "bookDiscovery.search" : "bookDiscovery.recommendations";
    if (kind === "unauthorized") {
      return <ConsumerNotice tone="error" title={t(`${prefix}.unauthorizedTitle`)} description={t(`${prefix}.unauthorizedDescription`)} action={<Link href={`/${locale}/auth/sign-in`} className="inline-flex min-h-11 items-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white">{t("bookDiscovery.states.signIn")}</Link>} />;
    }
    if (kind === "consent") {
      return <ConsumerNotice tone="error" title={t(`${prefix}.consentTitle`)} description={t(`${prefix}.consentDescription`)} action={<Link href={`/${locale}/account`} className="inline-flex min-h-11 items-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white">{t("bookDiscovery.states.openSettings")}</Link>} />;
    }
    if (kind === "quota") {
      return <ConsumerNotice tone="error" title={t(`${prefix}.quotaTitle`)} description={t(`${prefix}.quotaDescription`)} action={<Link href={`/${locale}/account`} className="inline-flex min-h-11 items-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white">{t("bookDiscovery.states.openSettings")}</Link>} />;
    }
    return <ConsumerNotice tone="error" title={t(`${prefix}.${kind}Title`)} description={kind === "offline" ? t("bookDiscovery.states.offline") : t(`${prefix}.${kind}Description`)} action={<button type="button" onClick={scope === "search" ? retrySearch : retryRecommendations} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]"><LoaderCircle aria-hidden="true" size={16} />{t("bookDiscovery.states.retry")}</button>} />;
  }

  function renderSearchContent() {
    if (searchState === "loading") {
      return <div data-testid="book-discovery-search-loading" className="rounded-3xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-8"><ConsumerLoadingState label={t("bookDiscovery.search.loading")} /></div>;
    }
    if (searchState === "error" && searchError) {
      if (errorKind(searchError.code) === "invalid") return <ConsumerNotice tone="error" title={t("bookDiscovery.search.invalidTitle")} description={t("bookDiscovery.search.invalidDescription")} />;
      return renderPolicyNotice(searchError, "search");
    }
    if (searchState === "empty") {
      return <div data-testid="book-discovery-empty"><ConsumerNotice title={t("bookDiscovery.search.emptyTitle")} description={t("bookDiscovery.search.emptyDescription")} /></div>;
    }
    if (searchState !== "ready") return null;
    return (
      <div className="grid gap-4" data-testid="book-discovery-results">
        {searchResults.map((book) => {
          const selected = selectedBook?.isbn === book.isbn && selectedBook?.title === book.title;
          return (
            <article key={`${book.isbn ?? book.title}-${book.author}`} data-testid="book-discovery-result" className={`rounded-3xl border bg-[var(--blab-surface-card)] p-5 transition ${selected ? "border-[var(--blab-color-primary)] shadow-[var(--blab-elevation-subtle)]" : "border-[var(--blab-glass-border)]"}`}>
              <div className="flex gap-4">
                <div className="grid h-28 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-glass-fill)]">
                  {book.imageUrl ? <Image src={book.imageUrl} alt={imageAlt(book, t)} width={80} height={112} className="h-full w-full object-cover" /> : <BookOpen aria-hidden="true" className="text-[var(--blab-color-primary)]" size={30} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-semibold">{book.title}</h3>
                      <p className="mt-1 truncate text-sm text-[var(--blab-text-tertiary)]">{book.author || t("bookDiscovery.result.authorUnknown")}</p>
                    </div>
                    {selected ? <Check aria-label={t("bookDiscovery.result.selected")} className="shrink-0 text-[var(--blab-color-success)]" size={20} /> : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--blab-text-tertiary)]">
                    {book.isbn ? <span>{t("bookDiscovery.result.isbn")}: {book.isbn}</span> : null}
                    {book.totalPages ? <span>{book.totalPages} {t("bookDiscovery.result.pages")}</span> : null}
                    {book.publisher ? <span>{book.publisher}</span> : null}
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <ConsumerButton type="button" variant={selected ? "secondary" : "primary"} text={selected ? t("bookDiscovery.result.selected") : t("bookDiscovery.result.select")} onClick={() => setSelectedBook(book)} />
                {book.aladinUrl ? <a href={book.aladinUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium text-[var(--blab-color-primary)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]">{t("bookDiscovery.result.openProvider")}</a> : null}
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  function renderRecommendations() {
    if (recommendationState === "loading") return <div data-testid="book-discovery-recommendations-loading" className="rounded-3xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-6"><ConsumerLoadingState label={t("bookDiscovery.recommendations.loading")} /></div>;
    if (recommendationState === "error" && recommendationError) return renderPolicyNotice(recommendationError, "recommendation");
    if (recommendationState === "empty") return <div data-testid="book-discovery-recommendations-empty"><ConsumerNotice title={t("bookDiscovery.recommendations.emptyTitle")} description={t("bookDiscovery.recommendations.emptyDescription")} /></div>;
    return (
      <div className="grid gap-3 md:grid-cols-2" data-testid="book-discovery-recommendations">
        {recommendations.map((recommendation) => {
          const imageUrl = trustedRecommendationImage(recommendation);
          return (
            <button key={`${recommendation.title}-${recommendation.author}`} type="button" data-testid="book-recommendation" onClick={() => setSelectedRecommendation(recommendation)} className="flex min-h-36 items-start gap-4 rounded-3xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-5 text-left transition hover:-translate-y-0.5 hover:border-[var(--blab-color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]">
              <div className="grid h-20 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-glass-fill)]">
                {imageUrl ? <Image src={imageUrl} alt={imageAlt(recommendation, t)} width={56} height={80} className="h-full w-full object-cover" /> : <Sparkles aria-hidden="true" className="text-[var(--blab-color-primary)]" size={24} />}
              </div>
              <span className="min-w-0">
                <strong className="block break-words text-base font-semibold">{recommendation.title}</strong>
                <span className="mt-1 block truncate text-sm text-[var(--blab-text-tertiary)]">{recommendation.author}</span>
                <span className="mt-3 block line-clamp-2 text-sm leading-6 text-[var(--blab-text-secondary)]">{recommendation.reason}</span>
                {recommendation.keywords.length > 0 ? <span className="mt-3 flex flex-wrap gap-1.5">{recommendation.keywords.slice(0, 3).map((keyword) => <span key={keyword} className="rounded-full bg-[var(--blab-color-primary)]/10 px-2 py-1 text-xs font-medium text-[var(--blab-color-primary)]">{keyword}</span>)}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  const cameraFallback = cameraState === "unsupported" || cameraState === "insecure" || cameraState === "denied";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12" data-testid="book-discovery-page" data-route-state={searchState}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,.9fr)]">
        <section>
          <div>
            <p className="text-sm font-medium text-[var(--blab-color-primary)]">{t("bookDiscovery.eyebrow")}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{t("bookDiscovery.title")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("bookDiscovery.description")}</p>
          </div>

          <ConsumerCard className="mt-8" data-testid="book-discovery-search-card">
            <form onSubmit={submitTextSearch} className="grid gap-4" aria-label={t("bookDiscovery.search.formLabel")}>
              <ConsumerTextField id="book-discovery-search" name="query" label={t("bookDiscovery.search.label")} value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); scheduledQuery.current = ""; }} hintText={t("bookDiscovery.search.hint")} ariaLabel={t("bookDiscovery.search.label")} inputMode="search" suffixIcon={<Search aria-hidden="true" size={18} />} clearLabel={t("bookDiscovery.search.clear")} onClear={() => { setSearchQuery(""); scheduledQuery.current = ""; }} />
              <div className="flex flex-wrap gap-3">
                <ConsumerButton type="submit" variant="primary" text={t("bookDiscovery.search.action")} icon={<Search aria-hidden="true" size={17} />} />
                <ConsumerButton type="button" variant="secondary" text={t("bookDiscovery.scanner.open")} icon={<Camera aria-hidden="true" size={17} />} onClick={() => setCameraOpen(true)} />
              </div>
            </form>
            <div className="mt-6 border-t border-[var(--blab-glass-border)] pt-6">
              <form onSubmit={submitIsbnSearch} className="grid gap-4" aria-label={t("bookDiscovery.isbn.formLabel")}>
                <ConsumerTextField id="book-discovery-isbn" name="isbn" label={t("bookDiscovery.isbn.label")} value={manualIsbn} onChange={(event) => { setManualIsbn(event.target.value); setIsbnError(false); }} hintText={t("bookDiscovery.isbn.hint")} ariaLabel={t("bookDiscovery.isbn.label")} inputMode="numeric" error={isbnError ? isbnErrorMessage : undefined} />
                <ConsumerButton type="submit" variant="secondary" text={t("bookDiscovery.isbn.action")} icon={<BookOpen aria-hidden="true" size={17} />} />
              </form>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--blab-text-tertiary)]">
                <label htmlFor="book-discovery-file" className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[var(--blab-glass-border)] px-3 py-2 font-medium text-[var(--blab-text-secondary)] hover:bg-[var(--blab-glass-fill)] focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--blab-color-primary)]"><FileImage aria-hidden="true" size={17} />{t("bookDiscovery.scanner.fileAction")}</label>
                <input id="book-discovery-file" type="file" accept="image/*" capture="environment" onChange={(event) => void handleFileChange(event)} className="sr-only" />
                <span>{t("bookDiscovery.isbn.fallback")}</span>
              </div>
              {fileState === "reading" ? <p role="status" className="mt-3 text-sm text-[var(--blab-text-tertiary)]">{t("bookDiscovery.scanner.fileReading")}</p> : null}
              {fileState === "detected" ? <p role="status" className="mt-3 text-sm text-[var(--blab-color-success)]">{t("bookDiscovery.scanner.detected")}</p> : null}
              {fileState === "manual-fallback" ? <p data-testid="book-discovery-file-fallback" role="status" className="mt-3 text-sm text-[var(--blab-color-warning)]">{t("bookDiscovery.scanner.fileFallback")}</p> : null}
            </div>
          </ConsumerCard>

          <div className="mt-6" data-testid="book-discovery-search-content">{renderSearchContent()}</div>
          {selectedBook ? <><ConsumerCard className="mt-5" data-testid="book-discovery-selected"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-[var(--blab-color-primary)]">{t("bookDiscovery.selected.eyebrow")}</p><h2 className="mt-1 text-xl font-semibold">{selectedBook.title}</h2><p className="mt-1 text-sm text-[var(--blab-text-tertiary)]">{selectedBook.author}</p>{selectedBook.isbn ? <p className="mt-2 text-xs text-[var(--blab-text-tertiary)]">{t("bookDiscovery.result.isbn")}: {selectedBook.isbn}</p> : null}</div><Check aria-hidden="true" className="text-[var(--blab-color-success)]" size={22} /></div><p className="mt-4 text-sm leading-6 text-[var(--blab-text-secondary)]">{t("bookDiscovery.selected.description")}</p></ConsumerCard><BookLifecycleClient locale={locale} selectedBook={selectedBook} /></> : null}
        </section>

        <aside className="lg:pt-12" aria-labelledby="book-discovery-recommendation-heading">
          <div className="mb-4"><p className="text-sm font-medium text-[var(--blab-color-primary)]"><Sparkles aria-hidden="true" className="mr-1 inline" size={15} />{t("bookDiscovery.recommendations.eyebrow")}</p><h2 id="book-discovery-recommendation-heading" className="mt-2 text-xl font-semibold">{t("bookDiscovery.recommendations.title")}</h2><p className="mt-2 text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("bookDiscovery.recommendations.description")}</p></div>
          {renderRecommendations()}
        </aside>
      </div>

      <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
        <DialogContent className="w-full max-w-xl rounded-3xl border-[var(--blab-glass-border)] bg-[var(--blab-surface-elevated)] p-6 text-[var(--blab-text-primary)] shadow-[var(--blab-elevation-surface)]">
          <DialogHeader className="text-left"><DialogTitle>{t("bookDiscovery.scanner.title")}</DialogTitle><DialogDescription>{t("bookDiscovery.scanner.description")}</DialogDescription></DialogHeader>
          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--blab-glass-border)] bg-black" data-camera-state={cameraState}>
            {cameraState === "checking" ? <div className="grid min-h-64 place-items-center text-sm text-white/70"><LoaderCircle aria-hidden="true" className="animate-spin" size={24} /><span className="sr-only">{t("bookDiscovery.scanner.checking")}</span></div> : null}
            {cameraState === "ready" ? <video ref={videoRef} muted playsInline className="aspect-video w-full object-cover" aria-label={t("bookDiscovery.scanner.videoLabel")} /> : null}
            {cameraFallback ? <div data-testid="book-discovery-camera-fallback" className="grid min-h-64 place-items-center gap-3 p-8 text-center text-white/85"><Camera aria-hidden="true" size={32} /><p className="max-w-sm text-sm leading-6">{cameraState === "insecure" ? t("bookDiscovery.scanner.insecure") : cameraState === "denied" ? t("bookDiscovery.scanner.denied") : t("bookDiscovery.scanner.unsupported")}</p><p className="max-w-sm text-xs leading-5 text-white/60">{t("bookDiscovery.scanner.manualFallback")}</p></div> : null}
          </div>
          <DialogFooter className="mt-4 sm:flex-row sm:justify-between">
            <label htmlFor="book-discovery-file-modal" className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--blab-glass-border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--blab-glass-fill)] focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--blab-color-primary)]"><Upload aria-hidden="true" size={17} />{t("bookDiscovery.scanner.fileAction")}</label>
            <input id="book-discovery-file-modal" type="file" accept="image/*" capture="environment" onChange={(event) => { setCameraOpen(false); void handleFileChange(event); }} className="sr-only" />
            <DialogClose asChild><ConsumerButton type="button" variant="secondary" text={t("bookDiscovery.scanner.close")} icon={<X aria-hidden="true" size={17} />} /></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedRecommendation !== null} onOpenChange={(open) => { if (!open) setSelectedRecommendation(null); }}>
        <DialogContent className="w-full max-w-lg rounded-3xl border-[var(--blab-glass-border)] bg-[var(--blab-surface-elevated)] p-6 text-[var(--blab-text-primary)] shadow-[var(--blab-elevation-surface)]">
          {selectedRecommendation ? <><DialogHeader className="text-left"><p className="text-sm font-medium text-[var(--blab-color-primary)]">{t("bookDiscovery.recommendations.actionEyebrow")}</p><DialogTitle className="mt-1">{selectedRecommendation.title}</DialogTitle><DialogDescription>{selectedRecommendation.author}</DialogDescription></DialogHeader><p className="mt-5 rounded-2xl bg-[var(--blab-color-primary)]/10 p-4 text-sm leading-6 text-[var(--blab-color-primary)]">{selectedRecommendation.reason}</p><DialogFooter className="mt-6"><DialogClose asChild><ConsumerButton type="button" variant="secondary" text={t("bookDiscovery.recommendations.viewDetails")} onClick={() => chooseRecommendation(selectedRecommendation, false)} /></DialogClose><ConsumerButton type="button" variant="primary" text={t("bookDiscovery.recommendations.startReading")} icon={<BookOpen aria-hidden="true" size={17} />} onClick={() => chooseRecommendation(selectedRecommendation, true)} /></DialogFooter></> : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
