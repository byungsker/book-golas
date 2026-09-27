"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { AiArtifactContent } from "@/components/consumer/ai-artifact-content";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConsumerDialogContent as DialogContent } from "@/components/consumer/consumer-dialog-content";
import type { ConsumerLocale } from "@/lib/consumer/paths";
import {
  aiArtifactErrorMessageKey,
  aiArtifactSafeActionForError,
  aiArtifactStateForError,
} from "@/lib/consumer/ai-artifact-state";
import {
  ApiErrorResponseSchema,
  ApiErrorSchema,
  AiArtifactGeneratedResponseSchema,
  AiArtifactReadResponseSchema,
  AiInsightsSchema,
  AiMindMapSchema,
  AiRecommendationsSchema,
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

function readError(value: unknown, status: number): ProductError {
  const parsed = ApiErrorResponseSchema.safeParse(value);
  if (parsed.success) return parsed.data.error;
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

function emptyArtifact(kind: AiArtifactKind, artifact: Artifact | null): boolean {
  if (artifact === null) return false;
  if (kind === "mindmap") return AiMindMapSchema.parse(artifact).clusters.length === 0;
  if (kind === "insights") return AiInsightsSchema.parse(artifact).length === 0;
  return AiRecommendationsSchema.parse(artifact).recommendations.length === 0;
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
      setArtifact(parsed.data.artifact);
      setCacheState(parsed.data.cacheState);
      setUiState(emptyArtifact(kind, parsed.data.artifact) ? "empty" : "success");
    } catch (caught) {
      const parsedError = ApiErrorSchema.safeParse(caught);
      const nextError = parsedError.success
        ? parsedError.data
        : { code: "offline", status: 503, message: "AI artifacts are offline.", retryable: true } satisfies ProductError;
      setError(nextError);
      setUiState(aiArtifactStateForError(nextError));
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
        setArtifact(parsed.data.artifact);
        setUiState(emptyArtifact(kind, parsed.data.artifact) ? "empty" : "fresh");
        return;
      }
      setArtifact(null);
      await generate(parsed.data.cacheState === "expired" ? "expired" : "missing");
    } catch (caught) {
      const parsedError = ApiErrorSchema.safeParse(caught);
      const nextError = parsedError.success
        ? parsedError.data
        : { code: "offline", status: 503, message: "AI artifacts are offline.", retryable: true } satisfies ProductError;
      setError(nextError);
      setUiState(aiArtifactStateForError(nextError));
    }
  }, [generate, kind, query]);

  useEffect(() => {
    void load();
  }, [load]);

  function errorMessage(nextError: ProductError): string {
    return t(`aiArtifacts.errors.${aiArtifactErrorMessageKey(nextError)}`);
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
    const safeAction = aiArtifactSafeActionForError(error);
    const action = safeAction === "sign_in"
      ? <Link href={`/${locale}/auth/sign-in`} className="inline-flex min-h-11 items-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white">{t("aiArtifacts.states.signIn")}</Link>
      : safeAction === "open_settings"
        ? <Link href={`/${locale}/account`} className="inline-flex min-h-11 items-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white">{t("aiArtifacts.states.openSettings")}</Link>
        : <ConsumerButton type="button" variant="primary" text={t("aiArtifacts.states.retry")} icon={<RefreshCw aria-hidden="true" size={16} />} onClick={() => void load()} data-testid={`ai-artifacts-${kind}-retry`} />;
    return (
      <div data-testid={`ai-artifacts-${kind}-${uiState}`} data-ai-operational-state={uiState}>
        <ConsumerNotice tone="error" title={title()} description={errorMessage(error)} action={action} />
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
        {!isLoading && !isError && !isEmpty && artifact !== null ? <div className="mt-6"><AiArtifactContent artifact={artifact} kind={kind} onSelectRecommendation={setSelectedRecommendation} /></div> : null}
      </ConsumerCard>
      {kind === "recommendations" && selectedRecommendation ? (
        <Dialog open={selectedRecommendation !== null} onOpenChange={(open) => { if (!open) setSelectedRecommendation(null); }}>
          <DialogContent className="bg-[var(--blab-surface-elevated)] text-[var(--blab-text-primary)]" data-testid="recommendation-action">
            <DialogHeader><DialogTitle>{selectedRecommendation.title}</DialogTitle><DialogDescription>{selectedRecommendation.author}</DialogDescription></DialogHeader>
            <p className="rounded-2xl bg-[var(--blab-color-primary)]/10 p-4 text-sm leading-6 text-[var(--blab-color-primary)]">{selectedRecommendation.reason}</p>
            <DialogFooter><DialogClose asChild><Link href={`/${locale}/book-list?query=${encodeURIComponent(selectedRecommendation.title)}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--blab-glass-border)] px-4 py-2 text-sm font-semibold" data-testid="recommendation-open">{t("aiArtifacts.recommendations.viewDetails")}</Link></DialogClose><Link href={`/${locale}/book-list?query=${encodeURIComponent(selectedRecommendation.title)}&intent=add`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white" data-testid="recommendation-add">{t("aiArtifacts.recommendations.startReading")}</Link></DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
