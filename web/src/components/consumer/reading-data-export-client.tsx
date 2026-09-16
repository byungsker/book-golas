"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { FormEvent } from "react";
import {
  ConsumerButton,
  ConsumerCard,
  ConsumerEmptyState,
  ConsumerErrorState,
  ConsumerLoadingState,
  ConsumerTextField,
} from "@/components/consumer/blab-primitives";
import type { ConsumerLocale } from "@/lib/consumer/paths";
import {
  ExportReadingDataRequestSchema,
  ExportReadingDataResultSchema,
  type ExportReadingDataResult,
} from "@/lib/product/contracts";

type ExportState = "loading" | "ready" | "empty" | "error" | "unauthorized" | "consent" | "quota" | "offline";
type RequestError = Error & { code?: string };

function currentYear(): number {
  return new Date().getUTCFullYear();
}

function yearOptions(): number[] {
  const latest = currentYear();
  return Array.from({ length: latest - 2019 }, (_, index) => latest - index);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function responseError(response: Response, payload: unknown): RequestError {
  const error = new Error("The export request failed.") as RequestError;
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const value = (payload as { error?: unknown }).error;
    if (typeof value === "object" && value !== null && "code" in value && typeof (value as { code?: unknown }).code === "string") {
      error.code = (value as { code: string }).code;
    }
  }
  if (response.status === 401) error.code = "unauthorized";
  return error;
}

function stateForError(error: RequestError): ExportState {
  if (error.code === "unauthorized") return "unauthorized";
  if (error.code === "consent_required") return "consent";
  if (error.code === "quota_exceeded" || error.code === "rate_limited") return "quota";
  if (error.code === "offline" || (typeof navigator !== "undefined" && !navigator.onLine)) return "offline";
  return "error";
}

export function ReadingDataExportClient({ locale, initialEmail = "" }: { locale: ConsumerLocale; initialEmail?: string }) {
  const t = useTranslations("consumer.export");
  const [year, setYear] = useState(String(currentYear()));
  const [email, setEmail] = useState(initialEmail);
  const [format, setFormat] = useState<"json" | "csv">("csv");
  const [includeImages, setIncludeImages] = useState(true);
  const [state, setState] = useState<ExportState>("ready");
  const [result, setResult] = useState<ExportReadingDataResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<{
    year: number;
    email: string;
    format: "json" | "csv";
    includeImages: boolean;
  } | null>(null);

  async function submitExport(nextRequest?: typeof lastRequest) {
    const request = nextRequest ?? {
      year: Number(year),
      email: email.trim(),
      format,
      includeImages,
    };
    const parsed = ExportReadingDataRequestSchema.safeParse(request);
    if (!parsed.success) {
      setState("error");
      setMessage(t("invalidRequest"));
      return;
    }
    setLastRequest(parsed.data);
    setState("loading");
    setResult(null);
    setMessage(null);
    try {
      const response = await fetch("/api/consumer/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(parsed.data),
      });
      const payload = await readJson(response);
      if (!response.ok) throw responseError(response, payload);
      const next = ExportReadingDataResultSchema.safeParse(payload);
      if (!next.success) throw new Error("The export response is malformed.");
      setResult(next.data);
      if (next.data.recordCount === 0) {
        setState("empty");
        setMessage(null);
      } else {
        setState("ready");
        setMessage(t("success", { year: next.data.year }));
      }
    } catch (caught) {
      const error = caught instanceof Error ? caught as RequestError : new Error("The export request failed.");
      setState(stateForError(error));
      setMessage(null);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitExport();
  }

  const title = state === "unauthorized" ? t("unauthorizedTitle") : state === "consent" ? t("consentTitle") : state === "quota" ? t("quotaTitle") : state === "offline" ? t("offlineTitle") : t("errorTitle");
  const description = state === "unauthorized" ? t("unauthorizedDescription") : state === "consent" ? t("consentDescription") : state === "quota" ? t("quotaDescription") : state === "offline" ? t("offlineDescription") : t("errorDescription");

  return (
    <div className="grid gap-6" data-testid="reading-data-export" data-export-state={state} data-export-locale={locale} aria-busy={state === "loading"}>
      <ConsumerCard>
        <h2 className="text-xl font-semibold">{t("title")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("description")}</p>
        {state === "loading" ? <div className="mt-5" data-testid="export-loading"><ConsumerLoadingState label={t("loading")} /></div> : null}
        {state === "empty" ? <div className="mt-5" data-testid="export-empty"><ConsumerEmptyState title={t("emptyTitle")} message={t("emptyDescription", { year: result?.year ?? year })} /></div> : null}
        {state !== "ready" && state !== "loading" && state !== "empty" ? (
          <div className="mt-5" data-testid="export-error-state" data-export-error={state}>
            <ConsumerErrorState title={title} message={description} />
            <div className="mt-5 flex justify-center"><ConsumerButton type="button" variant="secondary" text={t("retry")} onClick={() => lastRequest && void submitExport(lastRequest)} data-testid="export-retry" /></div>
          </div>
        ) : null}
        <form className="mt-6 grid gap-4" onSubmit={onSubmit} data-testid="export-form">
          <label className="grid gap-2 text-sm font-semibold" htmlFor="export-year"><span>{t("yearLabel")}</span><select id="export-year" className="min-h-11 rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-glass-fill)] px-3" value={year} disabled={state === "loading"} onChange={(event) => setYear(event.target.value)} data-testid="export-year">{yearOptions().map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <ConsumerTextField id="export-email" inputType="email" label={t("emailLabel")} hintText={t("emailHint")} autoComplete="email" value={email} disabled={state === "loading"} onChange={(event) => setEmail(event.target.value)} required />
          <label className="grid gap-2 text-sm font-semibold" htmlFor="export-format"><span>{t("formatLabel")}</span><select id="export-format" className="min-h-11 rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-glass-fill)] px-3" value={format} disabled={state === "loading"} onChange={(event) => setFormat(event.target.value as "json" | "csv")} data-testid="export-format"><option value="csv">CSV</option><option value="json">JSON</option></select></label>
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--blab-glass-border)] px-4 py-3 text-sm font-semibold"><input type="checkbox" checked={includeImages} disabled={state === "loading"} onChange={(event) => setIncludeImages(event.target.checked)} data-testid="export-include-images" /><span>{t("includeImages")}</span></label>
          <ConsumerButton type="submit" variant="primary" text={state === "loading" ? t("submitting") : t("submit")} loading={state === "loading"} loadingLabel={t("submitting")} data-testid="export-submit" />
          {message ? <p role="status" className="text-sm text-[var(--blab-color-success)]" data-testid="export-success">{message}</p> : null}
        </form>
      </ConsumerCard>
    </div>
  );
}
