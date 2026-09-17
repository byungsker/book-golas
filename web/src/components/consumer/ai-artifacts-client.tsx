"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { BookOpen, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import {
  ConsumerButton,
  ConsumerCard,
  ConsumerEmptyState,
  ConsumerLoadingState,
} from "@/components/consumer/blab-primitives";
import { ConsumerNotice } from "@/components/consumer/consumer-notice";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ConsumerLocale } from "@/lib/consumer/paths";
import {
  AiArtifactGeneratedResponseSchema,
  AiArtifactReadResponseSchema,
  type AiArtifactKind,
  type AiArtifactUiState,
  type AiInsights,
  type AiMindMap,
  type AiRecommendations,
  type BookRecommendation,
} from "@/lib/product/contracts";
import type { ProductError } from "@/lib/product/dal/errors";

type AiArtifactsClientProps =
  | { locale: ConsumerLocale; kind: "mindmap"; bookId: string; bookTitle: string }
  | { locale: ConsumerLocale; kind: "insights" }
  | { locale: ConsumerLocale; kind: "recommendations" };

type Artifact = AiMindMap | AiInsights | AiRecommendations;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
    code: status === 401 ? "unauthorized" : status === 403 ? "consent_required" : "offline",
    status: status === 401 ? 401 : status === 403 ? 403 : 503,
    message: "The AI artifact request failed.",
    retryable: true,
  };
}

function requestKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "00000000-0000-4000-8000-000000004499";
}

function stateForError(error: ProductError): AiArtifactUiState {
  if (error.code === "unauthorized") return "unauthorized";
  if (error.code === "consent_required") return "consent_required";
  if (error.code === "insufficient_data" || error.code === "validation_error") return "insufficient_data";
  if (error.code === "rate_limit_exceeded" || error.code === "rate_limited") return "rate_limit_exceeded";
  if (error.code === "quota_exceeded" || error.code === "budget_exceeded" || error.code === "hard_cap_exceeded") return "quota_exceeded";
  if (error.code === "provider_timeout" || error.code === "timeout") return "provider_timeout";
  if (error.code === "provider_error") return "provider_error";
  if (error.code === "configuration_error") return "configuration_error";
  if (error.code === "offline") return "offline";
  return "error";
}

function emptyArtifact(kind: AiArtifactKind, artifact: Artifact | null): boolean {
  if (artifact === null) return false;
  if (kind === "mindmap") return (artifact as AiMindMap).clusters.length === 0;
  if (kind === "insights") return (artifact as AiInsights).length === 0;
  return (artifact as AiRecommendations).recommendations.length === 0;
}

export function AiArtifactsClient(props: AiArtifactsClientProps) {
  const t = useTranslations("consumer");
  const { locale, kind } = props;
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [uiState, setUiState] = useState<AiArtifactUiState>("loading");
  const [cacheState, setCacheState] = useState<"fresh" | "missing" | "expired" | null>(null);
  const [error, setError] = useState<ProductError | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<BookRecommendation | null>(null);

  const query = useCallback(() => {
    const params = new URLSearchParams({ kind, locale });
    if (kind === "mindmap") params.set("bookId", props.bookId);
    return `/api/consumer/ai-artifacts?${params.toString()}`;
  }, [kind, locale, props]);

  const generate = useCallback(async (knownCacheState: "missing" | "expired" = "missing") => {
    setUiState("generating");
    setError(null);
    setCacheState(knownCacheState);
    try {
      const response = await fetch("/api/consumer/ai-artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          locale,
          requestKey: requestKey(),
          ...(kind === "mindmap" ? { bookId: props.bookId } : {}),
        }),
        cache: "no-store",
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw readError(body, response.status);
      const parsed = AiArtifactGeneratedResponseSchema.safeParse(body);
      if (!parsed.success || parsed.data.kind !== kind) throw readError(null, 503);
      setArtifact(parsed.data.artifact as Artifact);
      setCacheState(parsed.data.cacheState);
      setUiState(emptyArtifact(kind, parsed.data.artifact as Artifact) ? "empty" : "success");
    } catch (caught) {
      const nextError = isRecord(caught) && typeof caught.code === "string"
        ? caught as ProductError
        : { code: "offline", status: 503, message: "AI artifacts are offline.", retryable: true } satisfies ProductError;
      setError(nextError);
      setUiState(stateForError(nextError));
    }
  }, [kind, locale, props]);

  const load = useCallback(async () => {
    setUiState("loading");
    setError(null);
    try {
      const response = await fetch(query(), { cache: "no-store" });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw readError(body, response.status);
      const parsed = AiArtifactReadResponseSchema.safeParse(body);
      if (!parsed.success || parsed.data.kind !== kind) throw readError(null, 503);
      setCacheState(parsed.data.cacheState);
      if (parsed.data.artifact !== null) {
        setArtifact(parsed.data.artifact as Artifact);
        setUiState(emptyArtifact(kind, parsed.data.artifact as Artifact) ? "empty" : "fresh");
        return;
      }
      setArtifact(null);
      await generate(parsed.data.cacheState === "expired" ? "expired" : "missing");
    } catch (caught) {
      const nextError = isRecord(caught) && typeof caught.code === "string"
        ? caught as ProductError
        : { code: "offline", status: 503, message: "AI artifacts are offline.", retryable: true } satisfies ProductError;
      setError(nextError);
      setUiState(stateForError(nextError));
    }
  }, [generate, kind, query]);

  useEffect(() => {
    void load();
  }, [load]);

  function errorMessage(nextError: ProductError): string {
    if (nextError.code === "unauthorized") return t("aiArtifacts.errors.unauthorized");
    if (nextError.code === "consent_required") return t("aiArtifacts.errors.consent_required");
    if (nextError.code === "insufficient_data" || nextError.code === "validation_error") return t("aiArtifacts.errors.insufficient_data");
    if (nextError.code === "rate_limit_exceeded" || nextError.code === "rate_limited") return t("aiArtifacts.errors.rate_limit_exceeded");
    if (nextError.code === "quota_exceeded" || nextError.code === "budget_exceeded" || nextError.code === "hard_cap_exceeded") return t("aiArtifacts.errors.quota_exceeded");
    if (nextError.code === "provider_timeout" || nextError.code === "timeout") return t("aiArtifacts.errors.provider_timeout");
    if (nextError.code === "provider_error") return t("aiArtifacts.errors.provider_error");
    if (nextError.code === "configuration_error") return t("aiArtifacts.errors.configuration_error");
    if (nextError.code === "offline") return t("aiArtifacts.errors.offline");
    return t("aiArtifacts.errors.generic");
  }

  function title(): string {
    if (kind === "mindmap") return t("aiArtifacts.mindmap.title");
    if (kind === "insights") return t("aiArtifacts.insights.title");
    return t("aiArtifacts.recommendations.title");
  }

  function description(): string {
    if (kind === "mindmap") return t("aiArtifacts.mindmap.description");
    if (kind === "insights") return t("aiArtifacts.insights.description");
    return t("aiArtifacts.recommendations.description");
  }

  function renderFailure() {
    if (!error) return null;
    const action = error.code === "unauthorized"
      ? <Link href={`/${locale}/auth/sign-in`} className="inline-flex min-h-10 items-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white">{t("aiArtifacts.states.signIn")}</Link>
      : error.code === "consent_required"
        ? <Link href={`/${locale}/account`} className="inline-flex min-h-10 items-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white">{t("aiArtifacts.states.openSettings")}</Link>
        : <ConsumerButton type="button" variant="primary" text={t("aiArtifacts.states.retry")} icon={<RefreshCw aria-hidden="true" size={16} />} onClick={() => void load()} data-testid={`ai-artifacts-${kind}-retry`} />;
    return (
      <div data-testid={`ai-artifacts-${kind}-${uiState}`} data-ai-operational-state={uiState}>
        <ConsumerNotice tone="error" title={title()} description={errorMessage(error)} action={action} />
      </div>
    );
  }

  function renderMindMap(value: AiMindMap) {
    return (
      <div data-testid="ai-artifacts-mindmap-content" className="grid gap-4">
        {value.clusters.map((cluster) => (
          <section key={cluster.id} className="rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface)] p-4" data-testid="ai-artifacts-mindmap-cluster">
            <h3 className="text-lg font-semibold">{cluster.name}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--blab-text-secondary)]">{cluster.summary}</p>
            <div className="mt-4 grid gap-2">
              {cluster.nodes.map((node) => (
                <article key={node.id} className="rounded-xl border border-[var(--blab-glass-border)] p-3" data-testid="ai-artifacts-mindmap-node">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--blab-color-primary)]">{t(`aiArtifacts.mindmap.nodeTypes.${node.type}`)}</p>
                  <p className="mt-1 text-sm leading-6">{node.content}</p>
                  {node.pageNumber ? <p className="mt-1 text-xs text-[var(--blab-text-tertiary)]">{t("aiArtifacts.mindmap.page", { page: node.pageNumber })}</p> : null}
                </article>
              ))}
            </div>
          </section>
        ))}
        {value.connections.length > 0 ? (
          <section className="rounded-2xl border border-[var(--blab-glass-border)] p-4" data-testid="ai-artifacts-mindmap-connections">
            <h3 className="text-sm font-semibold">{t("aiArtifacts.mindmap.connections")}</h3>
            <ul className="mt-3 grid gap-2 text-sm text-[var(--blab-text-secondary)]">
              {value.connections.map((connection) => <li key={`${connection.fromNodeId}-${connection.toNodeId}`} className="rounded-xl bg-[var(--blab-surface)] p-3">{connection.fromNodeId} → {connection.toNodeId}: {connection.reason}</li>)}
            </ul>
          </section>
        ) : null}
      </div>
    );
  }

  function renderInsights(value: AiInsights) {
    return (
      <div data-testid="ai-artifacts-insights-content" className="grid gap-3">
        {value.map((insight) => (
          <article key={insight.id} className="rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface)] p-4" data-testid="ai-artifacts-insight">
            <div className="flex items-start justify-between gap-3"><h3 className="text-lg font-semibold">{insight.title}</h3><span className="rounded-full bg-[var(--blab-color-primary)]/10 px-2.5 py-1 text-xs text-[var(--blab-color-primary)]">{t(`aiArtifacts.insights.categories.${insight.category}`)}</span></div>
            <p className="mt-3 text-sm leading-6 text-[var(--blab-text-secondary)]">{insight.description}</p>
          </article>
        ))}
      </div>
    );
  }

  function renderRecommendations(value: AiRecommendations) {
    return (
      <div data-testid="ai-artifacts-recommendations-content" className="grid gap-3 sm:grid-cols-2">
        {value.recommendations.map((recommendation) => (
          <button key={`${recommendation.title}-${recommendation.author}`} type="button" className="flex min-h-36 items-start gap-3 rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--blab-color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" onClick={() => setSelectedRecommendation(recommendation)} data-testid="ai-artifacts-recommendation">
            <BookOpen aria-hidden="true" className="mt-1 shrink-0 text-[var(--blab-color-primary)]" size={22} />
            <span className="min-w-0"><strong className="block break-words text-base font-semibold">{recommendation.title}</strong><span className="mt-1 block text-sm text-[var(--blab-text-tertiary)]">{recommendation.author}</span><span className="mt-3 block text-sm leading-6 text-[var(--blab-text-secondary)]">{recommendation.reason}</span><span className="mt-3 flex flex-wrap gap-1.5">{recommendation.keywords.slice(0, 3).map((keyword) => <span key={keyword} className="rounded-full bg-[var(--blab-color-primary)]/10 px-2 py-1 text-xs text-[var(--blab-color-primary)]">{keyword}</span>)}</span></span><ChevronRight aria-hidden="true" className="mt-1 shrink-0 text-[var(--blab-text-tertiary)]" size={18} />
          </button>
        ))}
      </div>
    );
  }

  const isLoading = uiState === "loading" || uiState === "generating";
  const isError = error !== null;
  const isEmpty = uiState === "empty";

  return (
    <div data-testid={`ai-artifacts-${kind}`} data-ai-artifact-state={uiState} data-ai-cache-state={cacheState ?? "unknown"}>
      <ConsumerCard className="mt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--blab-color-primary)]"><Sparkles aria-hidden="true" className="mr-1 inline" size={14} />{t("aiArtifacts.eyebrow")}</p><h2 className="mt-2 text-xl font-semibold">{title()}</h2><p className="mt-2 text-sm leading-6 text-[var(--blab-text-secondary)]">{description()}</p>{kind === "mindmap" ? <p className="mt-2 text-sm text-[var(--blab-text-tertiary)]">{props.bookTitle}</p> : null}</div>
          <ConsumerButton type="button" variant="secondary" text={isLoading ? t("aiArtifacts.states.generating") : t("aiArtifacts.states.regenerate")} icon={<RefreshCw aria-hidden="true" size={16} />} loading={isLoading} loadingLabel={t("aiArtifacts.states.generating")} disabled={isLoading} onClick={() => void generate(cacheState === "expired" ? "expired" : "missing")} data-testid={`ai-artifacts-${kind}-generate`} />
        </div>
        {uiState === "loading" ? <div className="mt-6" data-testid={`ai-artifacts-${kind}-loading`}><ConsumerLoadingState label={t("aiArtifacts.states.loading")} /></div> : null}
        {uiState === "generating" ? <div className="mt-6" data-testid={`ai-artifacts-${kind}-generating`}><ConsumerLoadingState label={t("aiArtifacts.states.generating")} /></div> : null}
        {isError ? <div className="mt-6">{renderFailure()}</div> : null}
        {isEmpty ? <div className="mt-6" data-testid={`ai-artifacts-${kind}-empty`}><ConsumerEmptyState title={t("aiArtifacts.states.emptyTitle")} message={t("aiArtifacts.states.emptyDescription")} /></div> : null}
        {!isLoading && !isError && !isEmpty && artifact !== null ? <div className="mt-6">{kind === "mindmap" ? renderMindMap(artifact as AiMindMap) : kind === "insights" ? renderInsights(artifact as AiInsights) : renderRecommendations(artifact as AiRecommendations)}</div> : null}
      </ConsumerCard>
      {kind === "recommendations" && selectedRecommendation ? (
        <Dialog open={selectedRecommendation !== null} onOpenChange={(open) => { if (!open) setSelectedRecommendation(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>{selectedRecommendation.title}</DialogTitle><DialogDescription>{selectedRecommendation.author}</DialogDescription></DialogHeader>
            <p className="rounded-2xl bg-[var(--blab-color-primary)]/10 p-4 text-sm leading-6 text-[var(--blab-color-primary)]">{selectedRecommendation.reason}</p>
            <DialogFooter><DialogClose asChild><Link href={`/${locale}/book-list?query=${encodeURIComponent(selectedRecommendation.title)}`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--blab-glass-border)] px-4 py-2 text-sm font-semibold">{t("aiArtifacts.recommendations.viewDetails")}</Link></DialogClose><ConsumerButton type="button" variant="primary" text={t("aiArtifacts.recommendations.startReading")} onClick={() => { setSelectedRecommendation(null); window.location.href = `/${locale}/book-list?query=${encodeURIComponent(selectedRecommendation.title)}`; }} /></DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
