"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownUp, Camera, Check, Clipboard, Eye, FileImage, ImagePlus, Maximize2, RefreshCw, Replace, RotateCcw, Trash2, Upload } from "lucide-react";
import {
  ImagesOcrResponseSchema,
  imageExtension,
  validateBookImageBytes,
  type BookImage,
  type BookImageMimeType,
  type ImageCaptureState,
} from "../api/images-ocr-contracts";
import {
  ConsumerButton,
  ConsumerCard,
  ConsumerEmptyState,
  ConsumerErrorState,
  ConsumerLoadingState,
} from "@/shared/ui";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/primitives";
import { ConsumerDialogContent as DialogContent } from "@/shared/ui";
import type { ConsumerLocale } from "@/shared/routing";

type BookImageCaptureClientProps = {
  locale: ConsumerLocale;
  bookId: string;
  totalPages: number;
};

type LoadState = { phase: "loading" } | { phase: "ready" } | { phase: "error"; code: string };
type SelectedFile = { file: File; previewUrl: string; mimeType: BookImageMimeType };
type MemorablePageSort = "page_desc" | "page_asc" | "date_desc" | "date_asc";

function requestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? "00000000-0000-4000-8000-000000000999";
}

function errorCode(body: unknown, status: number): string {
  if (typeof body === "object" && body !== null && "error" in body) {
    const error = (body as { error?: { code?: unknown } }).error;
    if (error && typeof error.code === "string") return error.code;
  }
  return status === 401 ? "unauthorized" : "unavailable";
}

function fixtureValue(): string | null {
  if (typeof document === "undefined") return null;
  return document.cookie.match(/(?:^|; )bookgolas-route-fixture=([^;]+)/)?.[1] ?? null;
}

function fileValidationMessage(reason: "oversize" | "wrong_mime" | "corrupt", t: (key: string) => string): string {
  if (reason === "oversize") return t("validation.oversize");
  if (reason === "wrong_mime") return t("validation.mime");
  return t("validation.corrupt");
}

export function BookImageCaptureClient({ locale, bookId, totalPages }: BookImageCaptureClientProps) {
  const t = useTranslations("consumer.imagesOcr");
  const [images, setImages] = useState<BookImage[]>([]);
  const [loadState, setLoadState] = useState<LoadState>({ phase: "loading" });
  const [captureState, setCaptureState] = useState<ImageCaptureState>("idle");
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [pageNumber, setPageNumber] = useState("");
  const [caption, setCaption] = useState("");
  const [ocrConsent, setOcrConsent] = useState(false);
  const [manualDrafts, setManualDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [imageSourceOpen, setImageSourceOpen] = useState(false);
  const [replacementTarget, setReplacementTarget] = useState<BookImage | null>(null);
  const [replacementOptionsOpen, setReplacementOptionsOpen] = useState(false);
  const [replacementConfirmOpen, setReplacementConfirmOpen] = useState(false);
  const [replacingImageId, setReplacingImageId] = useState<string | null>(null);
  const [fullTextImage, setFullTextImage] = useState<BookImage | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<BookImage | null>(null);
  const [sort, setSort] = useState<MemorablePageSort>("date_desc");
  const [copiedImageId, setCopiedImageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const failedSignedUrlsRef = useRef(new Set<string>());

  const sortedImages = useMemo(() => [...images].sort((left, right) => {
    if (sort === "page_desc" || sort === "page_asc") {
      if (left.pageNumber === null) return 1;
      if (right.pageNumber === null) return -1;
      return sort === "page_asc" ? left.pageNumber - right.pageNumber : right.pageNumber - left.pageNumber;
    }
    const comparison = left.createdAt.localeCompare(right.createdAt);
    return sort === "date_asc" ? comparison : -comparison;
  }), [images, sort]);

  const loadImages = useCallback(async () => {
    setLoadState({ phase: "loading" });
    setError(null);
    try {
      const response = await fetch(`/api/consumer/images-ocr?bookId=${encodeURIComponent(bookId)}&locale=${locale}`, { cache: "no-store" });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setLoadState({ phase: "error", code: errorCode(body, response.status) });
        return;
      }
      const parsed = ImagesOcrResponseSchema.safeParse(body);
      if (!parsed.success || parsed.data.kind !== "list") {
        setLoadState({ phase: "error", code: "unavailable" });
        return;
      }
      setImages(parsed.data.images);
      setLoadState({ phase: "ready" });
    } catch {
      setLoadState({ phase: "error", code: "offline" });
    }
  }, [bookId, locale]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void loadImages();
    });
    return () => {
      active = false;
    };
  }, [loadImages]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function handleImageError(image: BookImage) {
    if (failedSignedUrlsRef.current.has(image.signedUrl)) return;
    failedSignedUrlsRef.current.add(image.signedUrl);
    void loadImages();
  }

  function errorMessage(code: string): string {
    if (code === "unauthorized") return t("errors.unauthorized");
    if (code === "consent_required") return t("errors.consent");
    if (code === "quota_exceeded") return t("errors.quota");
    if (code === "provider_error") return t("errors.provider");
    if (code === "payload_too_large") return t("errors.oversize");
    if (code === "clipboard_error") return t("errors.clipboard");
    if (code === "offline") return t("errors.offline");
    if (code === "not_found" || code === "forbidden") return t("errors.notFound");
    return t("errors.generic");
  }

  function clearSelectedFile() {
    if (selectedFile) URL.revokeObjectURL(selectedFile.previewUrl);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function selectFile(file: File | null) {
    setValidationError(null);
    setError(null);
    if (!file) return;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const validation = validateBookImageBytes({ mimeType: file.type, byteLength: file.size, bytes });
      if (!validation.ok) {
        setValidationError(fileValidationMessage(validation.reason, (key) => t(key)));
        return;
      }
      clearSelectedFile();
      setSelectedFile({ file, previewUrl: URL.createObjectURL(file), mimeType: validation.mimeType });
      setCaptureState("file_ready");
    } catch {
      setValidationError(t("validation.corrupt"));
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCaptureState("idle");
  }

  async function openCamera() {
    setImageSourceOpen(false);
    const fixture = fixtureValue();
    if (fixture === "images-ocr-insecure") {
      setCaptureState("insecure_context");
      fileInputRef.current?.click();
      return;
    }
    if (fixture === "images-ocr-denied") {
      setCaptureState("permission_denied");
      fileInputRef.current?.click();
      return;
    }
    if (fixture === "images-ocr-unsupported" || !globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCaptureState(!globalThis.isSecureContext ? "insecure_context" : "unsupported");
      fileInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      setCaptureState("camera_ready");
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCaptureState("permission_denied");
      fileInputRef.current?.click();
    }
  }

  function captureFrame() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("unavailable");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) {
        setValidationError(t("validation.corrupt"));
        return;
      }
      void selectFile(new File([blob], `capture.${imageExtension("image/png")}`, { type: "image/png" }));
      stopCamera();
    }, "image/png");
  }

  async function upload() {
    if (!selectedFile || saving) return;
    const page = pageNumber.trim() === "" ? null : Number(pageNumber);
    if (page !== null && (!Number.isInteger(page) || page < 1 || page > totalPages)) {
      setValidationError(t("validation.page"));
      return;
    }
    setSaving(true);
    setError(null);
    setValidationError(null);
    try {
      const body = new FormData();
      body.set("action", "upload");
      body.set("locale", locale);
      body.set("bookId", bookId);
      body.set("pageNumber", page === null ? "" : String(page));
      body.set("caption", caption);
      body.set("ocrConsent", String(ocrConsent));
      body.set("manualText", "");
      body.set("idempotencyKey", requestId());
      body.set("file", selectedFile.file);
      const response = await fetch("/api/consumer/images-ocr", { method: "POST", body, cache: "no-store" });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(errorCode(payload, response.status));
        return;
      }
      const parsed = ImagesOcrResponseSchema.safeParse(payload);
      if (!parsed.success || parsed.data.kind !== "saved") {
        setError("unavailable");
        return;
      }
      const saved = parsed.data;
      setImages((previous) => saved.duplicate ? previous.map((image) => image.id === saved.image.id ? saved.image : image) : [saved.image, ...previous]);
      if (replacingImageId && replacingImageId !== saved.image.id) {
        const replacedId = replacingImageId;
        const deleteResponse = await fetch("/api/consumer/images-ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", locale, bookId, imageId: replacedId, idempotencyKey: requestId() }),
          cache: "no-store",
        });
        if (deleteResponse.ok) setImages((previous) => previous.filter((image) => image.id !== replacedId));
      }
      setReplacingImageId(null);
      clearSelectedFile();
      setPageNumber("");
      setCaption("");
      setCaptureState("saved");
    } catch {
      setError("offline");
    } finally {
      setSaving(false);
    }
  }

  async function mutateJson(input: Record<string, unknown>) {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/consumer/images-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        cache: "no-store",
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(errorCode(payload, response.status));
        return;
      }
      const parsed = ImagesOcrResponseSchema.safeParse(payload);
      if (!parsed.success) {
        setError("unavailable");
        return;
      }
      const parsedResponse = parsed.data;
      if (parsedResponse.kind === "deleted") {
        setImages((previous) => previous.filter((image) => image.id !== parsedResponse.imageId));
      } else if (parsedResponse.kind === "saved") {
        setImages((previous) => previous.map((image) => image.id === parsedResponse.image.id ? parsedResponse.image : image));
      }
    } catch {
      setError("offline");
    } finally {
      setSaving(false);
    }
  }

  function chooseReplacementSource(source: "camera" | "file") {
    if (!replacementTarget) return;
    setReplacingImageId(replacementTarget.id);
    setReplacementTarget(null);
    setReplacementConfirmOpen(false);
    if (source === "camera") void openCamera();
    else fileInputRef.current?.click();
  }

  async function copyExtractedText(image: BookImage) {
    try {
      await navigator.clipboard.writeText(image.extractedText);
      setCopiedImageId(image.id);
      window.setTimeout(() => setCopiedImageId((current) => current === image.id ? null : current), 1_500);
    } catch (copyError) {
      if (copyError instanceof Error) setError("clipboard_error");
      else throw copyError;
    }
  }

  if (loadState.phase === "loading") {
    return <ConsumerCard className="mt-6" data-testid="images-ocr-panel"><ConsumerLoadingState label={t("loading")} /></ConsumerCard>;
  }

  if (loadState.phase === "error") {
    return (
      <ConsumerCard className="mt-6" data-testid="images-ocr-panel" data-state={loadState.code}>
        <ConsumerErrorState title={loadState.code === "unauthorized" ? t("errors.unauthorizedTitle") : t("errors.title")} message={errorMessage(loadState.code)} />
        <div className="mt-5 flex justify-center"><ConsumerButton type="button" variant="secondary" text={t("retryLoad")} icon={<RefreshCw aria-hidden="true" size={16} />} onClick={() => void loadImages()} data-testid="images-ocr-retry-load" /></div>
      </ConsumerCard>
    );
  }

  return (
    <ConsumerCard className="mt-6" data-testid="images-ocr-panel" data-state="ready">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--blab-color-primary)]">{t("eyebrow")}</p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--blab-text-primary)]">{t("title")}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--blab-text-secondary)]">{t("description")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ConsumerButton type="button" variant="primary" text={t("addMemorablePage")} icon={<ImagePlus aria-hidden="true" size={16} />} onClick={() => setImageSourceOpen(true)} data-testid="add-memorable-page" />
          <ConsumerButton type="button" variant="secondary" text={t("camera")} icon={<Camera aria-hidden="true" size={16} />} onClick={() => void openCamera()} data-testid="images-ocr-camera" />
          <ConsumerButton type="button" variant="secondary" text={t("chooseFile")} icon={<FileImage aria-hidden="true" size={16} />} onClick={() => fileInputRef.current?.click()} data-testid="images-ocr-choose-file" />
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" data-capture-disposition="file_fallback" className="sr-only" onChange={(event) => void selectFile(event.target.files?.[0] ?? null)} data-testid="images-ocr-file-input" />
        </div>
      </div>

      <p className="mt-3 text-xs text-[var(--blab-text-tertiary)]" data-testid="images-ocr-capture-state">{t(`captureStates.${captureState}`)}</p>
      {captureState === "camera_ready" ? <div className="mt-4 rounded-2xl border border-[var(--blab-glass-border)] p-3"><video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full rounded-xl bg-black object-cover" data-testid="images-ocr-camera-preview" /><div className="mt-3 flex gap-2"><ConsumerButton type="button" variant="primary" text={t("capture")} onClick={captureFrame} data-testid="images-ocr-capture" /><ConsumerButton type="button" variant="secondary" text={t("cancelCamera")} onClick={stopCamera} data-testid="images-ocr-cancel-camera" /></div></div> : null}

      {selectedFile ? <div className="mt-5 grid gap-4 rounded-2xl border border-[var(--blab-glass-border)] p-4 sm:grid-cols-[10rem_1fr]" data-testid="images-ocr-upload-form"><img src={selectedFile.previewUrl} alt={t("previewAlt")} className="h-32 w-full rounded-xl object-cover sm:h-40" data-testid="images-ocr-preview" /><div className="grid gap-3"><p className="text-sm text-[var(--blab-text-secondary)]">{selectedFile.file.name} · {Math.ceil(selectedFile.file.size / 1024)} KB</p><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm text-[var(--blab-text-secondary)]">{t("form.page")}<input type="number" min={1} max={totalPages} value={pageNumber} onChange={(event) => setPageNumber(event.target.value)} className="min-h-11 rounded-xl border border-[var(--blab-glass-border)] bg-black/20 px-3 text-[var(--blab-text-primary)]" data-testid="images-ocr-page" /></label><label className="grid gap-1 text-sm text-[var(--blab-text-secondary)]">{t("form.caption")}<input value={caption} onChange={(event) => setCaption(event.target.value)} className="min-h-11 rounded-xl border border-[var(--blab-glass-border)] bg-black/20 px-3 text-[var(--blab-text-primary)]" data-testid="images-ocr-caption" /></label></div><label className="flex items-start gap-3 rounded-xl border border-[var(--blab-glass-border)] bg-black/10 p-3 text-sm text-[var(--blab-text-secondary)]"><input type="checkbox" checked={ocrConsent} onChange={(event) => setOcrConsent(event.target.checked)} className="mt-1" data-testid="images-ocr-consent" /><span>{t("form.ocrConsent")}</span></label><div className="flex flex-wrap gap-2"><ConsumerButton type="button" variant="primary" text={t("upload")} loading={saving} loadingLabel={t("saving")} icon={<Upload aria-hidden="true" size={16} />} onClick={() => void upload()} data-testid="images-ocr-upload" /><ConsumerButton type="button" variant="secondary" text={t("cancel")} disabled={saving} onClick={clearSelectedFile} data-testid="images-ocr-cancel-upload" /></div></div></div> : null}
      {captureState !== "idle" && captureState !== "file_ready" && captureState !== "camera_ready" && captureState !== "saved" ? <p className="mt-3 rounded-xl bg-amber-400/10 px-4 py-3 text-sm text-amber-100" data-capture-disposition="file_fallback" data-testid="images-ocr-fallback-message">{t("fileFallback")}</p> : null}
      {validationError ? <p className="mt-3 rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-100" role="alert" data-testid="images-ocr-validation-error">{validationError}</p> : null}
      {error ? <p className="mt-3 rounded-xl bg-red-400/10 px-4 py-3 text-sm text-[var(--blab-color-error)]" role="alert" data-testid={error === "quota_exceeded" ? "ocr-limit" : "images-ocr-error"}>{errorMessage(error)}</p> : null}

      {images.length > 1 ? <label className="mt-5 flex items-center justify-end gap-2 text-sm text-[var(--blab-text-secondary)]" data-testid="memorable-page-sort-menu"><ArrowDownUp aria-hidden="true" size={16} /><span>{t("sort.label")}</span><select value={sort} onChange={(event) => setSort(event.target.value as MemorablePageSort)} className="min-h-11 rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] px-3 text-[var(--blab-text-primary)]" data-testid="memorable-page-sort-select"><option value="page_desc">{t("sort.pageDesc")}</option><option value="page_asc">{t("sort.pageAsc")}</option><option value="date_desc">{t("sort.dateDesc")}</option><option value="date_asc">{t("sort.dateAsc")}</option></select></label> : null}
      {images.length === 0 ? <div className="mt-5" data-testid="images-ocr-empty"><ConsumerEmptyState title={t("empty.title")} message={t("empty.description")} /></div> : <div className="mt-5 grid gap-4 sm:grid-cols-2" data-testid="images-ocr-list">{sortedImages.map((image) => <article key={image.id} className="overflow-hidden rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-glass-fill)]" data-testid={`images-ocr-image-${image.id}`} data-surface="existing-image" data-page-number={image.pageNumber ?? ""} data-created-at={image.createdAt} data-ocr-status={image.ocrStatus}><button type="button" className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--blab-color-primary)]" onClick={() => setFullScreenImage(image)} aria-label={t("openFullScreen")}><img src={image.signedUrl} alt={t("previewAlt")} className="aspect-video w-full object-cover" onError={() => handleImageError(image)} data-testid={`images-ocr-rendered-${image.id}`} /></button><div className="p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-[var(--blab-text-primary)]">{image.pageNumber === null ? t("pageUnknown") : t("page", { page: image.pageNumber })}</p><span className="rounded-full bg-[var(--blab-surface-elevated)] px-2 py-1 text-xs text-[var(--blab-text-secondary)]" data-testid={`images-ocr-status-${image.id}`}>{t(`ocrStatus.${image.ocrStatus}`)}</span></div>{image.caption ? <p className="mt-2 text-sm text-[var(--blab-text-secondary)]">{image.caption}</p> : null}{image.extractedText ? <div className="mt-3" data-testid={`extracted-text-${image.id}`}><p className="line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-[var(--blab-text-secondary)]">{image.extractedText}</p><div className="mt-2 flex flex-wrap gap-1"><button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[var(--blab-color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" onClick={() => setFullTextImage(image)} data-testid={`full-text-view-${image.id}`}><Eye aria-hidden="true" size={15} />{t("viewFullText")}</button><button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[var(--blab-color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" onClick={() => void copyExtractedText(image)} data-testid={`extracted-text-copy-${image.id}`}>{copiedImageId === image.id ? <Check aria-hidden="true" size={15} /> : <Clipboard aria-hidden="true" size={15} />}{copiedImageId === image.id ? t("copied") : t("copyText")}</button></div></div> : null}{image.ocrStatus === "failed" ? <div className="mt-3 grid gap-2"><p className="text-xs text-[var(--blab-color-warning)]" data-testid={image.ocrError?.toLowerCase().includes("quota") ? "ocr-limit" : `ocr-provider-state-${image.id}`}>{image.ocrError ?? t("errors.provider")}</p><textarea rows={3} value={manualDrafts[image.id] ?? image.extractedText} onChange={(event) => setManualDrafts((previous) => ({ ...previous, [image.id]: event.target.value }))} placeholder={t("manualPlaceholder")} className="rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] px-3 py-2 text-sm text-[var(--blab-text-primary)]" data-testid={`images-ocr-manual-text-${image.id}`} /><div className="flex flex-wrap gap-2"><ConsumerButton type="button" variant="secondary" text={t("saveManual")} disabled={saving} onClick={() => void mutateJson({ action: "manual", locale, bookId, imageId: image.id, manualText: manualDrafts[image.id] ?? image.extractedText, idempotencyKey: requestId() })} data-testid={`images-ocr-manual-${image.id}`} /><ConsumerButton type="button" variant="secondary" text={t("retryOcr")} disabled={saving} icon={<RotateCcw aria-hidden="true" size={15} />} onClick={() => void mutateJson({ action: "retry_ocr", locale, bookId, imageId: image.id, ocrConsent: true, idempotencyKey: requestId() })} data-testid={`images-ocr-retry-${image.id}`} /></div></div> : null}<div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm text-[var(--blab-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" onClick={() => { setReplacementTarget(image); setReplacementOptionsOpen(true); }} data-testid={`image-replace-options-${image.id}`}><Replace aria-hidden="true" size={14} />{t("replace")}</button><button type="button" className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm text-[var(--blab-color-error)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" disabled={saving} onClick={() => void mutateJson({ action: "delete", locale, bookId, imageId: image.id, idempotencyKey: requestId() })} data-testid={`images-ocr-delete-${image.id}`}><Trash2 aria-hidden="true" size={14} />{t("delete")}</button></div></div></article>)}</div>}

      <Dialog open={imageSourceOpen} onOpenChange={setImageSourceOpen}><DialogContent className="max-w-md rounded-3xl bg-[var(--blab-surface-elevated)] text-[var(--blab-text-primary)]" data-testid="image-source"><DialogHeader><DialogTitle>{t("imageSource.title")}</DialogTitle><DialogDescription>{t("imageSource.description")}</DialogDescription></DialogHeader><div className="mt-4 grid gap-3 sm:grid-cols-2"><ConsumerButton type="button" variant="secondary" text={t("imageSource.camera")} icon={<Camera aria-hidden="true" size={16} />} onClick={() => void openCamera()} /><ConsumerButton type="button" variant="secondary" text={t("imageSource.file")} icon={<FileImage aria-hidden="true" size={16} />} onClick={() => { setImageSourceOpen(false); fileInputRef.current?.click(); }} /></div></DialogContent></Dialog>

      <Dialog open={replacementOptionsOpen} onOpenChange={(open) => { setReplacementOptionsOpen(open); if (!open && !replacementConfirmOpen) setReplacementTarget(null); }}><DialogContent className="max-w-md rounded-3xl bg-[var(--blab-surface-elevated)] text-[var(--blab-text-primary)]" data-testid="image-replace-options"><DialogHeader><DialogTitle>{t("replaceOptions.title")}</DialogTitle><DialogDescription>{t("replaceOptions.description")}</DialogDescription></DialogHeader><DialogFooter className="mt-5"><DialogClose asChild><ConsumerButton type="button" variant="secondary" text={t("cancel")} /></DialogClose><ConsumerButton type="button" variant="primary" text={t("replaceOptions.continue")} onClick={() => { setReplacementOptionsOpen(false); setReplacementConfirmOpen(true); }} /></DialogFooter></DialogContent></Dialog>

      <Dialog open={replacementConfirmOpen} onOpenChange={setReplacementConfirmOpen}><DialogContent className="max-w-md rounded-3xl bg-[var(--blab-surface-elevated)] text-[var(--blab-text-primary)]" data-testid="replace-image-confirmation"><DialogHeader><DialogTitle>{t("replaceConfirm.title")}</DialogTitle><DialogDescription>{t("replaceConfirm.description")}</DialogDescription></DialogHeader><div className="mt-4 grid gap-3 sm:grid-cols-2"><ConsumerButton type="button" variant="secondary" text={t("imageSource.camera")} icon={<Camera aria-hidden="true" size={16} />} onClick={() => chooseReplacementSource("camera")} /><ConsumerButton type="button" variant="primary" text={t("imageSource.file")} icon={<FileImage aria-hidden="true" size={16} />} onClick={() => chooseReplacementSource("file")} /></div></DialogContent></Dialog>

      <Dialog open={fullTextImage !== null} onOpenChange={(open) => { if (!open) setFullTextImage(null); }}><DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto rounded-3xl bg-[var(--blab-surface-elevated)] text-[var(--blab-text-primary)]" data-testid="full-text-view"><DialogHeader><DialogTitle>{t("fullText.title")}</DialogTitle><DialogDescription>{fullTextImage?.pageNumber ? t("page", { page: fullTextImage.pageNumber }) : t("pageUnknown")}</DialogDescription></DialogHeader><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--blab-text-secondary)]">{fullTextImage?.extractedText}</p>{fullTextImage ? <ConsumerButton type="button" variant="secondary" text={copiedImageId === fullTextImage.id ? t("copied") : t("copyText")} icon={copiedImageId === fullTextImage.id ? <Check aria-hidden="true" size={15} /> : <Clipboard aria-hidden="true" size={15} />} onClick={() => void copyExtractedText(fullTextImage)} data-testid="full-text-copy" /> : null}</DialogContent></Dialog>

      <Dialog open={fullScreenImage !== null} onOpenChange={(open) => { if (!open) setFullScreenImage(null); }}><DialogContent className="max-h-[95vh] max-w-5xl overflow-hidden rounded-3xl bg-[var(--blab-surface-elevated)] p-3 text-[var(--blab-text-primary)]" data-testid="full-screen-image"><DialogHeader className="sr-only"><DialogTitle>{t("fullScreen.title")}</DialogTitle><DialogDescription>{t("fullScreen.description")}</DialogDescription></DialogHeader>{fullScreenImage ? <img src={fullScreenImage.signedUrl} alt={t("previewAlt")} className="max-h-[88vh] w-full rounded-2xl object-contain" /> : null}<span className="pointer-events-none absolute bottom-5 right-5 rounded-full bg-black/60 p-2 text-white"><Maximize2 aria-hidden="true" size={18} /></span></DialogContent></Dialog>
    </ConsumerCard>
  );
}
