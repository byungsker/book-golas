"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Highlighter, ImagePlus, Pencil, Plus, RefreshCw, StickyNote, Trash2 } from "lucide-react";
import {
  ConsumerButton,
  ConsumerCard,
  ConsumerEmptyState,
  ConsumerErrorState,
  ConsumerLoadingState,
} from "@/components/consumer/blab-primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ConsumerLocale } from "@/lib/consumer/paths";
import {
  NotesHighlightsResponseSchema,
  type ConsumerRecord,
  type ConsumerRecordType,
} from "@/lib/product/contracts";

type NotesHighlightsClientProps = {
  locale: ConsumerLocale;
  bookId: string;
  totalPages: number;
};

type RecordTab = "all" | ConsumerRecordType;
type LoadState = { phase: "loading" } | { phase: "ready" } | { phase: "error"; code: string };
type DialogMode = "create" | "edit" | "delete" | null;

type FormState = {
  recordType: ConsumerRecordType;
  pageNumber: string;
  contentText: string;
  caption: string;
  imageUrl: string;
  x: string;
  y: string;
  width: string;
  height: string;
  aiConsent: boolean;
};

const blankForm: FormState = {
  recordType: "note",
  pageNumber: "",
  contentText: "",
  caption: "",
  imageUrl: "",
  x: "0.1",
  y: "0.1",
  width: "0.7",
  height: "0.08",
  aiConsent: false,
};

function errorCode(body: unknown, status: number): string {
  if (typeof body === "object" && body !== null && "error" in body) {
    const error = (body as { error?: { code?: unknown } }).error;
    if (error && typeof error.code === "string") return error.code;
  }
  return status === 401 ? "unauthorized" : "unavailable";
}

function requestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? "00000000-0000-4000-8000-000000000999";
}

function trustedSourceHref(value: string | null, locale: ConsumerLocale, bookId: string, pageNumber: number | null): string | null {
  if (value) {
    try {
      return new URL(value).protocol === "https:" ? value : null;
    } catch {
      return null;
    }
  }
  return pageNumber === null ? null : `/${locale}/reading/${bookId}?page=${pageNumber}`;
}

export function NotesHighlightsClient({ locale, bookId, totalPages }: NotesHighlightsClientProps) {
  const t = useTranslations("consumer.notesHighlights");
  const [records, setRecords] = useState<ConsumerRecord[]>([]);
  const [loadState, setLoadState] = useState<LoadState>({ phase: "loading" });
  const [activeTab, setActiveTab] = useState<RecordTab>("all");
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingRecord, setEditingRecord] = useState<ConsumerRecord | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setLoadState({ phase: "loading" });
    setError(null);
    try {
      const response = await fetch(`/api/consumer/notes-highlights?bookId=${encodeURIComponent(bookId)}&locale=${locale}`, {
        cache: "no-store",
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setLoadState({ phase: "error", code: errorCode(body, response.status) });
        return;
      }
      const parsed = NotesHighlightsResponseSchema.safeParse(body);
      if (!parsed.success || parsed.data.kind !== "list") {
        setLoadState({ phase: "error", code: "unavailable" });
        return;
      }
      setRecords(parsed.data.records);
      setLoadState({ phase: "ready" });
    } catch {
      setLoadState({ phase: "error", code: "offline" });
    }
  }, [bookId, locale]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const visibleRecords = useMemo(
    () => activeTab === "all" ? records : records.filter((record) => record.recordType === activeTab),
    [activeTab, records],
  );

  function typeLabel(type: ConsumerRecordType): string {
    return t(`recordTypes.${type}`);
  }

  function openCreate(recordType: ConsumerRecordType) {
    setEditingRecord(null);
    setForm({ ...blankForm, recordType });
    setValidationError(null);
    setError(null);
    setDialogMode("create");
  }

  function openEdit(record: ConsumerRecord) {
    const rectangle = record.rectangles[0];
    setEditingRecord(record);
    setForm({
      recordType: record.recordType,
      pageNumber: record.pageNumber?.toString() ?? "",
      contentText: record.contentText,
      caption: record.caption ?? "",
      imageUrl: record.imageUrl ?? "",
      x: rectangle?.x.toString() ?? blankForm.x,
      y: rectangle?.y.toString() ?? blankForm.y,
      width: rectangle?.width.toString() ?? blankForm.width,
      height: rectangle?.height.toString() ?? blankForm.height,
      aiConsent: false,
    });
    setValidationError(null);
    setError(null);
    setDialogMode("edit");
  }

  function validateForm(): { pageNumber: number | null; rectangles: Array<{ x: number; y: number; width: number; height: number }> } | null {
    const pageNumber = form.pageNumber.trim() === "" ? null : Number(form.pageNumber);
    if (pageNumber !== null && (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > totalPages)) {
      setValidationError(t("validation.page"));
      return null;
    }
    if (form.recordType !== "highlight") return { pageNumber, rectangles: [] };
    const rectangle = {
      x: Number(form.x),
      y: Number(form.y),
      width: Number(form.width),
      height: Number(form.height),
    };
    if (
      !Object.values(rectangle).every(Number.isFinite) ||
      rectangle.x < 0 || rectangle.y < 0 || rectangle.width <= 0 || rectangle.height <= 0 ||
      rectangle.x + rectangle.width > 1 || rectangle.y + rectangle.height > 1
    ) {
      setValidationError(t("validation.rectangle"));
      return null;
    }
    return { pageNumber, rectangles: [rectangle] };
  }

  async function submitRecord() {
    if (saving || (dialogMode !== "create" && dialogMode !== "edit")) return;
    const valid = validateForm();
    if (!valid) return;
    setSaving(true);
    setValidationError(null);
    setError(null);
    try {
      const response = await fetch("/api/consumer/notes-highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          action: dialogMode === "edit" ? "update" : "create",
          locale,
          bookId,
          ...(editingRecord ? { recordId: editingRecord.id } : {}),
          recordType: form.recordType,
          pageNumber: valid.pageNumber,
          contentText: form.contentText,
          caption: form.caption.trim() || null,
          imageUrl: form.imageUrl.trim() || null,
          rectangles: valid.rectangles,
          sourceId: editingRecord?.sourceId ?? null,
          sourceHref: editingRecord?.sourceHref ?? null,
          aiConsent: form.aiConsent,
          idempotencyKey: requestId(),
        }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(errorCode(body, response.status));
        return;
      }
      const parsed = NotesHighlightsResponseSchema.safeParse(body);
      if (!parsed.success || parsed.data.kind === "list" || parsed.data.kind === "deleted") {
        setError("unavailable");
        return;
      }
      const savedRecord = parsed.data.record;
      setRecords((previous) => dialogMode === "create"
        ? [savedRecord, ...previous]
        : previous.map((record) => record.id === savedRecord.id ? savedRecord : record));
      setDialogMode(null);
      setEditingRecord(null);
    } catch {
      setError("offline");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord() {
    if (!editingRecord || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/consumer/notes-highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          action: "delete",
          locale,
          bookId,
          recordId: editingRecord.id,
          idempotencyKey: requestId(),
        }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(errorCode(body, response.status));
        return;
      }
      setRecords((previous) => previous.filter((record) => record.id !== editingRecord.id));
      setDialogMode(null);
      setEditingRecord(null);
    } catch {
      setError("offline");
    } finally {
      setSaving(false);
    }
  }

  async function retryIndex(record: ConsumerRecord) {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/consumer/notes-highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          action: "retry",
          locale,
          bookId,
          recordId: record.id,
          aiConsent: true,
          idempotencyKey: requestId(),
        }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(errorCode(body, response.status));
        return;
      }
      const parsed = NotesHighlightsResponseSchema.safeParse(body);
      if (!parsed.success || parsed.data.kind === "list" || parsed.data.kind === "deleted") {
        setError("unavailable");
        return;
      }
      const savedRecord = parsed.data.record;
      setRecords((previous) => previous.map((candidate) => candidate.id === savedRecord.id ? savedRecord : candidate));
    } catch {
      setError("offline");
    } finally {
      setSaving(false);
    }
  }

  function errorMessage(code: string): string {
    if (code === "unauthorized") return t("errors.unauthorized");
    if (code === "consent_required") return t("errors.consent");
    if (code === "quota_exceeded") return t("errors.quota");
    if (code === "offline") return t("errors.offline");
    if (code === "not_found" || code === "forbidden") return t("errors.notFound");
    return t("errors.generic");
  }

  function indexLabel(status: ConsumerRecord["indexStatus"]): string {
    return t(`indexStatus.${status}`);
  }

  function iconFor(type: ConsumerRecordType) {
    if (type === "note") return <StickyNote aria-hidden="true" size={16} />;
    if (type === "highlight") return <Highlighter aria-hidden="true" size={16} />;
    return <ImagePlus aria-hidden="true" size={16} />;
  }

  if (loadState.phase === "loading") {
    return <ConsumerCard className="mt-6" data-testid="notes-highlights-panel"><ConsumerLoadingState label={t("loading")} /></ConsumerCard>;
  }

  if (loadState.phase === "error") {
    const stateTitle = loadState.code === "unauthorized" ? t("errors.unauthorizedTitle") : t("errors.title");
    return (
      <ConsumerCard className="mt-6" data-testid="notes-highlights-panel" data-state={loadState.code}>
        <ConsumerErrorState title={stateTitle} message={errorMessage(loadState.code)} />
        <div className="mt-5 flex justify-center"><ConsumerButton type="button" variant="secondary" text={t("retryLoad")} icon={<RefreshCw aria-hidden="true" size={16} />} onClick={() => void loadRecords()} data-testid="notes-highlights-retry-load" /></div>
      </ConsumerCard>
    );
  }

  return (
    <ConsumerCard className="mt-6" data-testid="notes-highlights-panel" data-state="ready">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--blab-color-primary)]">{t("eyebrow")}</p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--blab-text-primary)]">{t("title")}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--blab-text-secondary)]">{t("description")}</p>
        </div>
        <div className="flex flex-wrap gap-2" data-testid="notes-highlights-create-actions">
          <ConsumerButton type="button" variant="secondary" text={t("create.note")} icon={<Plus aria-hidden="true" size={15} />} onClick={() => openCreate("note")} data-testid="notes-highlights-create-note" />
          <ConsumerButton type="button" variant="secondary" text={t("create.highlight")} icon={<Plus aria-hidden="true" size={15} />} onClick={() => openCreate("highlight")} data-testid="notes-highlights-create-highlight" />
          <ConsumerButton type="button" variant="secondary" text={t("create.memorable_page")} icon={<Plus aria-hidden="true" size={15} />} onClick={() => openCreate("memorable_page")} data-testid="notes-highlights-create-memorable-page" />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-b border-[var(--blab-glass-border)] pb-3" role="tablist" aria-label={t("tabs.label")} data-testid="notes-highlights-tabs">
        {(["all", "note", "highlight", "memorable_page"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${activeTab === tab ? "bg-[var(--blab-color-primary)] text-white" : "text-[var(--blab-text-secondary)] hover:bg-white/10"}`}
            onClick={() => setActiveTab(tab)}
            data-testid={`notes-highlights-tab-${tab.replace("_", "-")}`}
          >
            {tab === "all" ? <BookOpen aria-hidden="true" size={15} /> : iconFor(tab)}
            {tab === "all" ? t("tabs.all") : typeLabel(tab)}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-100" role="alert" data-testid="notes-highlights-error">{errorMessage(error)}</p> : null}

      {visibleRecords.length === 0 ? (
        <div className="mt-5" data-testid="notes-highlights-empty"><ConsumerEmptyState title={t("empty.title")} message={t("empty.description")} /></div>
      ) : (
        <div className="mt-5 space-y-3" data-testid="notes-highlights-record-list">
          {visibleRecords.map((record) => {
            const sourceHref = trustedSourceHref(record.sourceHref, locale, bookId, record.pageNumber);
            return (
              <article key={record.id} className="rounded-2xl border border-[var(--blab-glass-border)] bg-black/10 p-4" data-testid={`notes-highlights-record-${record.id}`} data-record-type={record.recordType}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--blab-text-primary)]">{iconFor(record.recordType)}<span>{typeLabel(record.recordType)}</span>{record.pageNumber !== null ? <span className="text-[var(--blab-text-tertiary)]">· p. {record.pageNumber}</span> : null}</div>
                  <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-xs text-[var(--blab-text-secondary)]" data-testid={`notes-highlights-index-status-${record.id}`}>{indexLabel(record.indexStatus)}</span>
                </div>
                {record.contentText ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--blab-text-secondary)]">{record.contentText}</p> : null}
                {record.caption ? <p className="mt-2 text-sm italic text-[var(--blab-text-secondary)]">{record.caption}</p> : null}
                {record.recordType === "highlight" ? <p className="mt-2 text-xs text-[var(--blab-text-tertiary)]" data-testid={`notes-highlights-rectangles-${record.id}`}>{t("rectangleCount", { count: record.rectangles.length })}</p> : null}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  {sourceHref ? <Link href={sourceHref} className="text-[var(--blab-color-primary)] underline-offset-4 hover:underline" data-testid={`notes-highlights-source-${record.id}`}>{t("sourceNavigation")}</Link> : null}
                  {record.indexStatus === "failed" ? <button type="button" className="inline-flex items-center gap-1 text-amber-200 underline-offset-4 hover:underline" onClick={() => void retryIndex(record)} disabled={saving} data-testid={`notes-highlights-retry-${record.id}`}><RefreshCw aria-hidden="true" size={14} />{t("retryIndex")}</button> : null}
                  <button type="button" className="inline-flex items-center gap-1 text-[var(--blab-text-secondary)] underline-offset-4 hover:underline" onClick={() => openEdit(record)} data-testid={`notes-highlights-edit-${record.id}`}><Pencil aria-hidden="true" size={14} />{t("edit")}</button>
                  <button type="button" className="inline-flex items-center gap-1 text-red-200 underline-offset-4 hover:underline" onClick={() => { setEditingRecord(record); setDialogMode("delete"); setError(null); }} data-testid={`notes-highlights-delete-${record.id}`}><Trash2 aria-hidden="true" size={14} />{t("delete")}</button>
                </div>
                {record.indexStatus === "failed" && record.indexError ? <p className="mt-3 text-xs text-amber-200" data-testid={`notes-highlights-index-error-${record.id}`}>{record.indexError}</p> : null}
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={dialogMode !== null} onOpenChange={(open) => { if (!open && !saving) { setDialogMode(null); setEditingRecord(null); } }}>
        <DialogContent data-testid="notes-highlights-dialog">
          {dialogMode === "delete" ? (
            <>
              <DialogHeader><DialogTitle>{t("deleteTitle")}</DialogTitle><DialogDescription>{t("deleteDescription")}</DialogDescription></DialogHeader>
              <DialogFooter className="mt-4"><ConsumerButton type="button" variant="secondary" text={t("cancel")} disabled={saving} onClick={() => setDialogMode(null)} data-testid="notes-highlights-delete-cancel" /><ConsumerButton type="button" variant="destructive" text={t("deleteConfirm")} loading={saving} loadingLabel={t("saving")} onClick={() => void deleteRecord()} data-testid="notes-highlights-delete-confirm" /></DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader><DialogTitle>{dialogMode === "edit" ? t("editTitle") : t("createTitle")}</DialogTitle><DialogDescription>{t("formDescription")}</DialogDescription></DialogHeader>
              <div className="mt-2 grid gap-4" data-testid="notes-highlights-form">
                <label className="grid gap-2 text-sm text-[var(--blab-text-secondary)]">{t("form.type")}<select className="min-h-10 rounded-xl border border-[var(--blab-glass-border)] bg-black/20 px-3 text-[var(--blab-text-primary)]" value={form.recordType} onChange={(event) => setForm((previous) => ({ ...previous, recordType: event.target.value as ConsumerRecordType }))} data-testid="notes-highlights-type"><option value="note">{typeLabel("note")}</option><option value="highlight">{typeLabel("highlight")}</option><option value="memorable_page">{typeLabel("memorable_page")}</option></select></label>
                <label className="grid gap-2 text-sm text-[var(--blab-text-secondary)]">{t("form.page")}<input type="number" min={1} max={totalPages} className="min-h-10 rounded-xl border border-[var(--blab-glass-border)] bg-black/20 px-3 text-[var(--blab-text-primary)]" value={form.pageNumber} onChange={(event) => setForm((previous) => ({ ...previous, pageNumber: event.target.value }))} data-testid="notes-highlights-page" /></label>
                <label className="grid gap-2 text-sm text-[var(--blab-text-secondary)]">{t("form.text")}<textarea rows={4} className="rounded-xl border border-[var(--blab-glass-border)] bg-black/20 px-3 py-2 text-[var(--blab-text-primary)]" value={form.contentText} onChange={(event) => setForm((previous) => ({ ...previous, contentText: event.target.value }))} data-testid="notes-highlights-text" /></label>
                <label className="grid gap-2 text-sm text-[var(--blab-text-secondary)]">{t("form.caption")}<input className="min-h-10 rounded-xl border border-[var(--blab-glass-border)] bg-black/20 px-3 text-[var(--blab-text-primary)]" value={form.caption} onChange={(event) => setForm((previous) => ({ ...previous, caption: event.target.value }))} data-testid="notes-highlights-caption" /></label>
                {form.recordType === "memorable_page" ? <label className="grid gap-2 text-sm text-[var(--blab-text-secondary)]">{t("form.imageUrl")}<input type="url" className="min-h-10 rounded-xl border border-[var(--blab-glass-border)] bg-black/20 px-3 text-[var(--blab-text-primary)]" value={form.imageUrl} onChange={(event) => setForm((previous) => ({ ...previous, imageUrl: event.target.value }))} data-testid="notes-highlights-image-url" /></label> : null}
                {form.recordType === "highlight" ? <fieldset className="grid gap-3 rounded-xl border border-[var(--blab-glass-border)] p-3"><legend className="px-1 text-sm text-[var(--blab-text-secondary)]">{t("form.rectangle")}</legend><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{(["x", "y", "width", "height"] as const).map((key) => <label key={key} className="grid gap-1 text-xs text-[var(--blab-text-tertiary)]">{key}<input type="number" step="0.01" min={0} max={1} className="min-h-9 rounded-lg border border-[var(--blab-glass-border)] bg-black/20 px-2 text-sm text-[var(--blab-text-primary)]" value={form[key]} onChange={(event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))} data-testid={`notes-highlights-rect-${key}`} /></label>)}</div></fieldset> : null}
                <label className="flex items-start gap-3 rounded-xl border border-[var(--blab-glass-border)] bg-black/10 p-3 text-sm text-[var(--blab-text-secondary)]"><input type="checkbox" checked={form.aiConsent} onChange={(event) => setForm((previous) => ({ ...previous, aiConsent: event.target.checked }))} className="mt-1" data-testid="notes-highlights-consent" /><span>{t("form.aiConsent")}</span></label>
                {validationError ? <p className="text-sm text-red-200" role="alert" data-testid="notes-highlights-validation-error">{validationError}</p> : null}
                {error ? <p className="text-sm text-red-200" role="alert">{errorMessage(error)}</p> : null}
              </div>
              <DialogFooter className="mt-4"><ConsumerButton type="button" variant="secondary" text={t("cancel")} disabled={saving} onClick={() => setDialogMode(null)} data-testid="notes-highlights-cancel" /><ConsumerButton type="button" variant="primary" text={dialogMode === "edit" ? t("saveChanges") : t("save")} loading={saving} loadingLabel={t("saving")} onClick={() => void submitRecord()} data-testid="notes-highlights-save" /></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ConsumerCard>
  );
}
