"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Clock3,
  Home,
  LibraryBig,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { ConsumerBottomBar } from "@/components/consumer/blab-primitives";
import { SignOutButton } from "@/components/consumer/sign-out-button";
import {
  consumerShellTabs,
  getActiveConsumerTab,
  getChartView,
  getHomeView,
  getNextCycledPath,
  type ConsumerShellTab,
} from "@/lib/consumer/shell";
import type { ConsumerLocale } from "@/lib/consumer/paths";

const icons = [Home, LibraryBig, BarChart3, CalendarDays, UserRound] as const;

export function ConsumerShell({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: ConsumerLocale;
}) {
  const t = useTranslations("consumer.shell");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchOpen, setSearchOpen] = useState(false);
  const activeTab = getActiveConsumerTab(pathname);

  if (!activeTab) return children;

  const selectedIndex = consumerShellTabs.findIndex((tab) => tab.id === activeTab);
  const tabLabels = [t("tabs.home"), t("tabs.library"), t("tabs.chart"), t("tabs.calendar"), t("tabs.account")];
  const mobileTabLabels = [t("mobileTabs.home"), t("mobileTabs.library"), t("mobileTabs.chart"), t("mobileTabs.calendar"), t("mobileTabs.account")];
  const bottomTabs = consumerShellTabs.map((tab, index) => {
    const Icon = icons[index];
    return {
      label: mobileTabLabels[index],
      icon: <Icon aria-hidden="true" size={20} strokeWidth={1.8} />,
      activeIcon: <Icon aria-hidden="true" fill="currentColor" size={20} strokeWidth={2.1} />,
    };
  });

  function navigateToTab(tab: ConsumerShellTab) {
    setSearchOpen(false);
    if (tab === activeTab) {
      const nextPath = getNextCycledPath(locale, tab, new URLSearchParams(searchParams.toString()));
      if (nextPath) router.push(nextPath);
      return;
    }
    const target = consumerShellTabs.find((item) => item.id === tab);
    if (target) router.push(`/${locale}${target.path}`);
  }

  function selectSearchMode(mode: "book" | "recall") {
    setSearchOpen(false);
    router.push(mode === "book"
      ? `/${locale}/books/new?mode=search`
      : `/${locale}/library?view=records&search=recall`);
  }

  const otherLocale = locale === "ko" ? "en" : "ko";

  return (
    <div
      className="bookgolas-consumer-shell min-h-dvh bg-[var(--blab-surface-scaffold)] text-[var(--blab-text-primary)] lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]"
      data-testid="consumer-shell"
      data-active-tab={activeTab}
      data-home-view={getHomeView(searchParams.get("view"))}
      data-chart-view={getChartView(searchParams.get("view"))}
    >
      <aside data-testid="consumer-desktop-navigation" className="sticky top-0 hidden h-dvh flex-col border-r border-[var(--blab-glass-border)] bg-[var(--blab-surface)] p-[var(--blab-space-lg)] lg:flex">
        <Link href={`/${locale}/home`} className="flex items-center gap-3 rounded-xl px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]">
          <Image src="/logo-bookgolas.png" alt="" width={40} height={40} className="rounded-xl" />
          <span className="font-semibold">{t("brand")}</span>
        </Link>
        <nav className="mt-[var(--blab-space-xxl)] grid gap-[var(--blab-space-sm)]" aria-label={t("navigationLabel")}>
          {consumerShellTabs.map((tab, index) => {
            const Icon = icons[index];
            const selected = tab.id === activeTab;
            return (
              <Link
                key={tab.id}
                href={`/${locale}${tab.path}`}
                aria-current={selected ? "page" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  navigateToTab(tab.id);
                }}
                className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)] ${selected ? "bg-[var(--blab-glass-fill)] text-[var(--blab-color-primary)]" : "text-[var(--blab-text-secondary)] hover:bg-[var(--blab-glass-fill)]"}`}
              >
                <Icon aria-hidden="true" size={20} fill={selected ? "currentColor" : "none"} />
                <span>{tabLabels[index]}</span>
              </Link>
            );
          })}
        </nav>
        <button type="button" onClick={() => setSearchOpen((open) => !open)} className="mt-[var(--blab-space-lg)] flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--blab-glass-border)] px-4 text-sm font-medium text-[var(--blab-text-secondary)] transition hover:bg-[var(--blab-glass-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" aria-expanded={searchOpen} aria-controls="consumer-search-modes">
          <Search aria-hidden="true" size={20} />
          {t("search.open")}
        </button>
        <div className="mt-auto flex items-end justify-between gap-3 pt-[var(--blab-space-lg)]">
          <Link href={`/${otherLocale}${consumerShellTabs[selectedIndex].path}`} className="min-h-11 rounded-xl px-3 py-2 text-sm text-[var(--blab-text-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]">
            {otherLocale.toUpperCase()}
          </Link>
          <SignOutButton locale={locale} />
        </div>
      </aside>

      <div className="min-w-0 pb-32 lg:pb-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--blab-glass-border)] bg-[var(--blab-surface)]/90 px-[var(--blab-space-lg)] py-[var(--blab-space-md)] backdrop-blur lg:hidden">
          <Link href={`/${locale}/home`} className="flex items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]">
            <Image src="/logo-bookgolas.png" alt="" width={36} height={36} className="rounded-xl" />
            <span className="font-semibold">{t("brand")}</span>
          </Link>
          <Link href={`/${otherLocale}${consumerShellTabs[selectedIndex].path}`} className="min-h-11 rounded-xl px-3 py-2 text-sm text-[var(--blab-text-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]">
            {otherLocale.toUpperCase()}
          </Link>
        </header>
        {children}
      </div>

      <div id="bookgolas-floating-timer-root" data-testid="consumer-timer-mount" className="fixed bottom-28 right-[var(--blab-space-lg)] z-30 flex min-h-11 items-center gap-2 rounded-full border border-[var(--blab-glass-border)] bg-[var(--blab-surface-elevated)] px-4 text-sm text-[var(--blab-text-secondary)] shadow-[var(--blab-elevation-surface)] lg:bottom-[var(--blab-space-xxl)] lg:right-[var(--blab-space-xxl)]">
        <Clock3 aria-hidden="true" size={18} />
        <span>{t("timerMount")}</span>
      </div>

      <div data-testid="consumer-mobile-navigation" className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        <ConsumerBottomBar
          tabs={bottomTabs}
          selectedIndex={selectedIndex}
          onTabSelected={(index) => navigateToTab(consumerShellTabs[index].id)}
          onSearchTap={() => setSearchOpen((open) => !open)}
          actionIcon={<Search aria-hidden="true" size={20} />}
          actionLabel={t("search.open")}
          ariaLabel={t("navigationLabel")}
          noMargin
        />
      </div>

      {searchOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-[var(--blab-glass-fill)] p-[var(--blab-space-lg)] sm:items-center sm:justify-center" onClick={() => setSearchOpen(false)}>
          <section id="consumer-search-modes" role="dialog" aria-modal="true" aria-labelledby="consumer-search-title" className="w-full rounded-[var(--blab-radius-card)] border border-[var(--blab-glass-border)] bg-[var(--blab-surface-elevated)] p-[var(--blab-space-xl)] shadow-[var(--blab-elevation-surface)] sm:max-w-md" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--blab-color-primary)]">{t("search.eyebrow")}</p>
                <h2 id="consumer-search-title" className="mt-1 text-xl font-semibold">{t("search.title")}</h2>
              </div>
              <button type="button" onClick={() => setSearchOpen(false)} aria-label={t("search.close")} className="grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-[var(--blab-glass-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]">
                <X aria-hidden="true" size={20} />
              </button>
            </div>
            <div className="mt-[var(--blab-space-lg)] grid gap-[var(--blab-space-md)]">
              <button type="button" onClick={() => selectSearchMode("book")} className="flex min-h-16 items-center gap-4 rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface)] px-4 text-left transition hover:bg-[var(--blab-glass-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]">
                <BookOpen aria-hidden="true" className="text-[var(--blab-color-primary)]" />
                <span><strong className="block">{t("search.bookTitle")}</strong><span className="mt-1 block text-sm text-[var(--blab-text-tertiary)]">{t("search.bookDescription")}</span></span>
              </button>
              <button type="button" onClick={() => selectSearchMode("recall")} className="flex min-h-16 items-center gap-4 rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface)] px-4 text-left transition hover:bg-[var(--blab-glass-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]">
                <Sparkles aria-hidden="true" className="text-[var(--blab-color-primary)]" />
                <span><strong className="block">{t("search.recallTitle")}</strong><span className="mt-1 block text-sm text-[var(--blab-text-tertiary)]">{t("search.recallDescription")}</span></span>
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
