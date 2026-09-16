"use client";

import { useEffect, useState } from "react";
import { CircleAlert, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  AI_CONSENT_POLICY_VERSION,
  AiConsentMutationSuccessSchema,
  AiConsentSnapshotSchema,
  mapAiOperationalError,
  type AiConsentMutationSuccess,
  type AiConsentRecord,
  type AiConsentSnapshot,
  type AiOperationalState,
  type AiProvider,
} from "@/lib/product/contracts";
import { getAiConsentDisclosure } from "@/lib/consumer/ai-consent-disclosures";
import {
  ConsumerButton,
  ConsumerCard,
  ConsumerErrorState,
  ConsumerLoadingState,
} from "@/components/consumer/blab-primitives";

const providers: readonly AiProvider[] = ["google_cloud_vision", "open_ai"];

type ApiFailure = Error & {
  readonly operationalState: AiOperationalState;
  readonly code: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function requestSnapshot(): Promise<AiConsentSnapshot> {
  let response: Response;
  try {
    response = await fetch("/api/consumer/ai-consent", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (error) {
    const failure = new Error(error instanceof Error ? error.message : "offline") as ApiFailure;
    Object.assign(failure, { operationalState: "offline", code: "offline" });
    throw failure;
  }

  const body = await readJson(response);
  if (!response.ok) {
    const errorBody = isRecord(body) && isRecord(body.error) ? body.error : body;
    const code = isRecord(errorBody) && typeof errorBody.code === "string" ? errorBody.code : undefined;
    const failure = new Error("AI consent status is unavailable") as ApiFailure;
    Object.assign(failure, {
      operationalState: mapAiOperationalError({ code, status: response.status }),
      code: code ?? "unavailable",
    });
    throw failure;
  }

  const parsed = AiConsentSnapshotSchema.safeParse(body);
  if (!parsed.success) {
    const failure = new Error("AI consent response is malformed") as ApiFailure;
    Object.assign(failure, { operationalState: "configuration_error", code: "configuration_error" });
    throw failure;
  }
  return parsed.data;
}

function makeMutationFailure(response: Response, body: unknown): ApiFailure {
  const errorBody = isRecord(body) && isRecord(body.error) ? body.error : body;
  const code = isRecord(errorBody) && typeof errorBody.code === "string" ? errorBody.code : undefined;
  const failure = new Error("AI consent change was not saved") as ApiFailure;
  Object.assign(failure, {
    operationalState: mapAiOperationalError({ code, status: response.status }),
    code: code ?? "unavailable",
  });
  return failure;
}

function recordWithUpdate(
  record: AiConsentRecord,
  update: Pick<AiConsentMutationSuccess, "state" | "receiptId" | "updatedAt" | "canSend">,
): AiConsentRecord {
  return {
    ...record,
    state: update.state,
    policyVersion: AI_CONSENT_POLICY_VERSION,
    receiptId: update.receiptId,
    updatedAt: update.updatedAt,
    canSend: update.canSend,
    grantedAt: update.state === "allowed" ? update.updatedAt : record.grantedAt,
    withdrawnAt: update.state === "not_allowed" ? update.updatedAt : null,
  };
}

function replaceRecord(
  snapshot: AiConsentSnapshot,
  provider: AiProvider,
  next: AiConsentRecord,
): AiConsentSnapshot {
  return {
    ...snapshot,
    consents: snapshot.consents.map((record) => record.provider === provider ? next : record),
  };
}

export function AiConsentOperationalNotice({
  state,
  t,
}: {
  state: AiOperationalState;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-100" role="alert" data-ai-operational-state={state}>
      <p className="font-semibold">{t(`errors.${state}`)}</p>
      {state === "unknown" || state === "configuration_error" ? (
        <p className="mt-1 text-xs text-amber-100/80">{t("failClosed")}</p>
      ) : null}
    </div>
  );
}

export function AiConsentSettings({ locale }: { locale: "ko" | "en" }) {
  const t = useTranslations("consumer.aiConsent");
  const [snapshot, setSnapshot] = useState<AiConsentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingProvider, setPendingProvider] = useState<AiProvider | null>(null);
  const [loadError, setLoadError] = useState<AiOperationalState | null>(null);
  const [mutationError, setMutationError] = useState<AiOperationalState | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      setSnapshot(await requestSnapshot());
    } catch (error) {
      const failure = error as Partial<ApiFailure>;
      setLoadError(failure.operationalState ?? "configuration_error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function mutate(provider: AiProvider) {
    const record = snapshot?.consents.find((item) => item.provider === provider);
    if (!record || pendingProvider !== null) return;
    if (record.state === "unknown" || record.state === "unavailable") {
      await load();
      return;
    }

    const action = record.state === "allowed" ? "withdraw" : "grant";
    setPendingProvider(provider);
    setMutationError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch("/api/consumer/ai-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          action,
          locale,
          policyVersion: AI_CONSENT_POLICY_VERSION,
          provider,
        }),
      });
      const body = await readJson(response);
      if (!response.ok) throw makeMutationFailure(response, body);
      const parsed = AiConsentMutationSuccessSchema.safeParse(body);
      if (!parsed.success) throw Object.assign(new Error("AI consent response is malformed"), { operationalState: "configuration_error" });
      setSnapshot((current) => current ? replaceRecord(current, provider, recordWithUpdate(record, parsed.data)) : current);
      setSuccessMessage(action === "grant" ? t("success.grant") : t("success.withdraw"));
    } catch (error) {
      const failure = error as Partial<ApiFailure>;
      setMutationError(failure.operationalState ?? "configuration_error");
      if (failure.code === "consent_status_unknown") {
        setSnapshot((current) => current ? replaceRecord(current, provider, {
          ...record,
          state: "unknown",
          canSend: false,
        }) : current);
      }
    } finally {
      setPendingProvider(null);
    }
  }

  if (loading) return <ConsumerLoadingState label={t("loading")} data-testid="ai-consent-loading" />;

  if (loadError || !snapshot) {
    return (
      <ConsumerCard role="alert" data-testid="ai-consent-error" data-ai-consent-state={loadError ?? "configuration_error"}>
        <ConsumerErrorState
          title={t("errorTitle")}
          message={t(`errors.${loadError ?? "configuration_error"}`)}
          icon={<CircleAlert aria-hidden="true" />}
        />
        <ConsumerButton type="button" className="mt-4" variant="secondary" onClick={() => void load()} data-testid="ai-consent-retry">
          <RefreshCw aria-hidden="true" className="mr-2 size-4" />
          {t("retry")}
        </ConsumerButton>
      </ConsumerCard>
    );
  }

  return (
    <div className="space-y-4" data-testid="ai-consent-settings" data-ai-consent-policy-version={AI_CONSENT_POLICY_VERSION}>
      {mutationError ? <AiConsentOperationalNotice state={mutationError} t={t} /> : null}
      {successMessage ? <p className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-3 text-sm text-emerald-100" role="status" data-testid="ai-consent-saved">{successMessage}</p> : null}
      {providers.map((provider) => {
        const record = snapshot.consents.find((item) => item.provider === provider);
        if (!record) return null;
        const disclosure = getAiConsentDisclosure(provider, locale);
        const isPending = pendingProvider === provider;
        const buttonLabel = record.state === "allowed" ? t("withdraw") : record.state === "not_allowed" ? t("grant") : t("retry");
        return (
          <ConsumerCard key={provider} data-testid={`ai-consent-provider-${provider}`} data-ai-provider={provider} data-ai-consent-state={record.state} data-ai-can-send={record.canSend ? "true" : "false"}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[var(--blab-text-primary)]">{t(`providers.${provider}.title`)}</h3>
                <p className="mt-1 text-sm leading-6 text-[var(--blab-text-tertiary)]">{t(`providers.${provider}.description`)}</p>
                <dl className="mt-4 grid gap-2 text-xs text-[var(--blab-text-tertiary)] sm:grid-cols-3">
                  <div><dt className="font-semibold text-[var(--blab-text-secondary)]">{t("statusLabel")}</dt><dd data-testid={`ai-consent-state-${provider}`}>{t(`states.${record.state}`)}</dd></div>
                  <div><dt className="font-semibold text-[var(--blab-text-secondary)]">{t("policyLabel")}</dt><dd data-testid={`ai-consent-policy-${provider}`}>{record.policyVersion ?? t("notRecorded")}</dd></div>
                  <div><dt className="font-semibold text-[var(--blab-text-secondary)]">{t("receiptLabel")}</dt><dd className="break-all" data-testid={`ai-consent-receipt-${provider}`}>{record.receiptId ?? t("notRecorded")}</dd></div>
                </dl>
              </div>
              <ConsumerButton
                type="button"
                variant={record.state === "allowed" ? "secondary" : "primary"}
                onClick={() => void mutate(provider)}
                disabled={isPending || pendingProvider !== null}
                loading={isPending}
                loadingLabel={t("saving")}
                data-testid={`ai-consent-toggle-${provider}`}
              >
                {buttonLabel}
              </ConsumerButton>
            </div>

            <details className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid={`ai-consent-details-${provider}`}>
              <summary className="cursor-pointer text-sm font-semibold text-[var(--blab-text-secondary)]">{t("details")}</summary>
              <div className="mt-3 space-y-3 text-sm leading-6 text-[var(--blab-text-tertiary)]">
                <p>{disclosure.description}</p>
                <dl className="space-y-2">
                  <div><dt className="font-semibold text-[var(--blab-text-secondary)]">{t("actionLabel")}</dt><dd>{disclosure.triggerContext.feature}</dd></div>
                  <div><dt className="font-semibold text-[var(--blab-text-secondary)]">{t("dataLabel")}</dt><dd>{disclosure.triggerContext.data}</dd></div>
                  <div><dt className="font-semibold text-[var(--blab-text-secondary)]">{t("recipientLabel")}</dt><dd>{disclosure.recipient}</dd></div>
                </dl>
                <p>{disclosure.dataDescription}</p>
                <p className="font-medium text-[var(--blab-text-secondary)]">{disclosure.optionalNotice}</p>
              </div>
            </details>
            {!record.canSend ? <p className="mt-3 text-xs text-[var(--blab-text-tertiary)]" data-testid={`ai-consent-blocked-${provider}`}>{t("sendBlocked")}</p> : null}
          </ConsumerCard>
        );
      })}
    </div>
  );
}
