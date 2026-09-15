"use client";

import { BookOpen, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { ConsumerButton, ConsumerCard } from "@/components/consumer/blab-primitives";
import {
  completeOnboardingState,
  readOnboardingState,
  type AgePolicyStatus,
} from "@/lib/consumer/onboarding";

const pageIcons = [BookOpen, Search, Sparkles] as const;

function handleAgePolicyKeyDown(
  event: KeyboardEvent<HTMLElement>,
  onSelect: () => void,
) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  onSelect();
}

export function OnboardingFlow({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const t = useTranslations("consumer.onboarding");
  const [ready, setReady] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [showAgePolicy, setShowAgePolicy] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const dialogHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const state = readOnboardingState(window.localStorage);
        if (state.status === "complete") {
          router.replace(nextPath);
          return;
        }
      } catch {
        setSaveFailed(true);
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [nextPath, router]);

  useEffect(() => {
    if (showAgePolicy) dialogHeadingRef.current?.focus();
  }, [showAgePolicy]);

  const openAgePolicy = () => {
    setSaveFailed(false);
    setShowAgePolicy(true);
  };

  const chooseAgePolicy = (agePolicy: AgePolicyStatus) => {
    setSaveFailed(false);
    if (!completeOnboardingState(window.localStorage, agePolicy)) {
      setSaveFailed(true);
      return;
    }
    router.replace(nextPath);
  };

  const moveNext = () => {
    if (currentPage === pageIcons.length - 1) {
      openAgePolicy();
      return;
    }
    setCurrentPage((page) => page + 1);
  };

  if (!ready) {
    return (
      <main className="bookgolas-onboarding bookgolas-onboarding--loading">
        <p role="status">{t("loading")}</p>
      </main>
    );
  }

  const Icon = pageIcons[currentPage];
  const lastPage = currentPage === pageIcons.length - 1;

  return (
    <main className="bookgolas-onboarding" data-testid="onboarding-flow">
      <section className="bookgolas-onboarding__shell" aria-labelledby="onboarding-title">
        <div className="bookgolas-onboarding__page" key={currentPage} data-testid={`onboarding-page-${currentPage + 1}`}>
          <div className="bookgolas-onboarding__icon" aria-hidden="true">
            <Icon size={56} strokeWidth={1.8} />
          </div>
          <p className="bookgolas-onboarding__eyebrow">{t("eyebrow")}</p>
          <h1 id="onboarding-title">{t(`pages.${currentPage}.title`)}</h1>
          <p className="bookgolas-onboarding__description">{t(`pages.${currentPage}.description`)}</p>
        </div>

        <div className="bookgolas-onboarding__controls">
          <ConsumerButton type="button" variant="secondary" text={t("skip")} onClick={openAgePolicy} data-testid="onboarding-skip" />
          <ol className="bookgolas-onboarding__indicators" aria-label={t("pageProgress")}>
            {pageIcons.map((_, index) => (
              <li
                key={index}
                className={index === currentPage ? "is-active" : undefined}
                aria-current={index === currentPage ? "step" : undefined}
                aria-label={t("pageIndicator", { current: index + 1, total: pageIcons.length })}
              />
            ))}
          </ol>
          <ConsumerButton
            type="button"
            text={lastPage ? t("start") : t("next")}
            onClick={moveNext}
            data-testid={lastPage ? "onboarding-start" : "onboarding-next"}
          />
        </div>
      </section>

      {showAgePolicy && (
        <div className="bookgolas-onboarding__backdrop" data-testid="age-policy-backdrop">
          <section className="bookgolas-onboarding__dialog" role="dialog" aria-modal="true" aria-labelledby="age-policy-title">
            <p className="bookgolas-onboarding__eyebrow">{t("agePolicy.eyebrow")}</p>
            <h2 id="age-policy-title" ref={dialogHeadingRef} tabIndex={-1}>{t("agePolicy.title")}</h2>
            <p>{t("agePolicy.description")}</p>
            <div className="bookgolas-onboarding__age-options">
              <ConsumerCard
                role="button"
                tabIndex={0}
                onClick={() => chooseAgePolicy("under14")}
                onKeyDown={(event) =>
                  handleAgePolicyKeyDown(event, () => chooseAgePolicy("under14"))
                }
                data-testid="age-policy-under14"
                aria-label={`${t("agePolicy.under14.title")}. ${t("agePolicy.under14.description")}`}
              >
                <strong>{t("agePolicy.under14.title")}</strong>
                <span>{t("agePolicy.under14.description")}</span>
              </ConsumerCard>
              <ConsumerCard
                role="button"
                tabIndex={0}
                onClick={() => chooseAgePolicy("age14OrOlder")}
                onKeyDown={(event) =>
                  handleAgePolicyKeyDown(event, () => chooseAgePolicy("age14OrOlder"))
                }
                data-testid="age-policy-age14OrOlder"
                aria-label={`${t("agePolicy.age14OrOlder.title")}. ${t("agePolicy.age14OrOlder.description")}`}
              >
                <strong>{t("agePolicy.age14OrOlder.title")}</strong>
                <span>{t("agePolicy.age14OrOlder.description")}</span>
              </ConsumerCard>
            </div>
            {saveFailed && <p className="bookgolas-onboarding__error" role="alert">{t("agePolicy.saveFailed")}</p>}
            <ConsumerButton type="button" variant="secondary" text={t("agePolicy.back")} onClick={() => setShowAgePolicy(false)} />
          </section>
        </div>
      )}
    </main>
  );
}
