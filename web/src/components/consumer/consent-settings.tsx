"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ConsumerButton,
  ConsumerCard,
  ConsumerErrorState,
  ConsumerLoadingState,
} from "@/components/consumer/blab-primitives";

const consentKinds = ["ai", "notifications", "camera", "share", "ocr"] as const;
type ConsentKind = (typeof consentKinds)[number];
type ConsentStatus = "required" | "granted" | "denied";

type ConsentState = Record<ConsentKind, ConsentStatus>;

const initialState: ConsentState = {
  ai: "required",
  notifications: "required",
  camera: "required",
  share: "required",
  ocr: "required",
};

export function ConsentSettings() {
  const t = useTranslations("consumer.consent");
  const [consents, setConsents] = useState<ConsentState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingKind, setPendingKind] = useState<ConsentKind | null>(null);
  const [errorKey, setErrorKey] = useState<"load" | "save" | "offline" | null>(null);

  useEffect(() => {
    let active = true;

    async function loadConsents() {
      try {
        const response = await fetch("/api/consumer/consent", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!response.ok) throw new Error("load");
        const body: unknown = await response.json();
        if (!body || typeof body !== "object" || !Array.isArray((body as { consents?: unknown }).consents)) {
          throw new Error("load");
        }

        const next = { ...initialState };
        for (const value of (body as { consents: unknown[] }).consents) {
          if (!value || typeof value !== "object") continue;
          const record = value as { kind?: unknown; status?: unknown };
          if (consentKinds.includes(record.kind as ConsentKind) && (record.status === "granted" || record.status === "denied")) {
            next[record.kind as ConsentKind] = record.status;
          }
        }
        if (active) setConsents(next);
      } catch {
        if (active) setErrorKey(window.navigator.onLine ? "load" : "offline");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadConsents();
    return () => {
      active = false;
    };
  }, []);

  async function updateConsent(kind: ConsentKind) {
    if (!window.navigator.onLine) {
      setErrorKey("offline");
      return;
    }

    const status: Exclude<ConsentStatus, "required"> = consents[kind] === "granted" ? "denied" : "granted";
    setPendingKind(kind);
    setErrorKey(null);
    try {
      const response = await fetch("/api/consumer/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ kind, status, version: "2026-09" }),
      });
      if (!response.ok) throw new Error("save");
      setConsents((current) => ({ ...current, [kind]: status }));
    } catch {
      setErrorKey(window.navigator.onLine ? "save" : "offline");
    } finally {
      setPendingKind(null);
    }
  }

  if (isLoading) {
    return <ConsumerLoadingState label={t("loading")} />;
  }

  return (
    <div className="space-y-4" aria-busy={pendingKind !== null}>
      {errorKey ? (
        <ConsumerCard role="alert">
          <ConsumerErrorState title={t("errorTitle")} message={t(`errors.${errorKey}`)} icon="⚠️" />
        </ConsumerCard>
      ) : null}
      {consentKinds.map((kind) => {
        const status = consents[kind];
        const enabled = status === "granted";
        return (
          <ConsumerCard key={kind} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--blab-text-primary)]">{t(`kinds.${kind}.title`)}</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--blab-text-tertiary)]">{t(`kinds.${kind}.description`)}</p>
              <p className="mt-2 text-xs text-[var(--blab-text-tertiary)]">{t(`status.${status}`)}</p>
            </div>
            <ConsumerButton
              type="button"
              variant={enabled ? "secondary" : "primary"}
              onClick={() => void updateConsent(kind)}
              disabled={pendingKind !== null}
              loading={pendingKind === kind}
              loadingLabel={t("saving")}
            >
              {enabled ? t("deny") : t("grant")}
            </ConsumerButton>
          </ConsumerCard>
        );
      })}
    </div>
  );
}
