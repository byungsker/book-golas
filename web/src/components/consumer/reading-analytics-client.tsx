"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  Flag,
  Gift,
  Share2,
  Target,
  X,
} from "lucide-react";
import type {
  ReadingAnalyticsData,
  ReadingAnalyticsStatus,
  ReadingAnalyticsTab,
  ReadingAnalyticsView,
} from "@/lib/product/contracts";
import { calendarDayKeyFromDate } from "@/lib/product/contracts";
import type { ConsumerLocale } from "@/lib/consumer/paths";

function numberFormat(value: number, locale: ConsumerLocale): string {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", { maximumFractionDigits: 1 }).format(value);
}

function shortNumber(value: number, locale: ConsumerLocale): string {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatDuration(seconds: number, locale: ConsumerLocale): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) return locale === "ko" ? `${hours}시간 ${remainingMinutes}분` : `${hours}h ${remainingMinutes}m`;
  return locale === "ko" ? `${remainingMinutes}분` : `${remainingMinutes} min`;
}

function formatDay(day: string, locale: ConsumerLocale): string {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${day}T12:00:00Z`));
}

function dayToDate(day: string): Date {
  return new Date(`${day}T12:00:00Z`);
}

function dateToDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthDay(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function shiftMonth(year: number, month: number, amount: number): { year: number; month: number } {
  const value = new Date(Date.UTC(year, month - 1 + amount, 1, 12));
  return { year: value.getUTCFullYear(), month: value.getUTCMonth() + 1 };
}

function shareText(data: ReadingAnalyticsData, locale: ConsumerLocale): string {
  const m = data.metrics;
  const separator = locale === "ko" ? " · " : " · ";
  return [
    locale === "ko" ? "나의 북골라스 독서 통계" : "My Bookgolas reading stats",
    `${m.totalPagesRead}${locale === "ko" ? "페이지" : " pages read"}${separator}${m.completedBooks}${locale === "ko" ? "권 완독" : " books finished"}`,
    `${m.activeDays}${locale === "ko" ? "일 활동" : " active days"}${separator}${m.currentStreak}${locale === "ko" ? "일 스트릭" : " day streak"}`,
  ].join("\n");
}

function MetricCard({
  testId,
  label,
  value,
  detail,
  icon,
}: {
  testId: string;
  label: string;
  value: string;
  detail?: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-4" data-testid={testId}>
      <div className="flex items-center gap-2 text-sm text-[var(--blab-text-tertiary)]">{icon}<span>{label}</span></div>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
      {detail ? <p className="mt-1 text-xs text-[var(--blab-text-tertiary)]">{detail}</p> : null}
    </article>
  );
}

export function ReadingAnalyticsClient({
  locale,
  initialData,
}: {
  locale: ConsumerLocale;
  initialData: ReadingAnalyticsData;
}) {
  const t = useTranslations("consumer");
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState<ReadingAnalyticsTab>("overview");
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalInput, setGoalInput] = useState(String(initialData.goal.targetBooks || 24));
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalError, setGoalError] = useState(false);
  const [goalNotice, setGoalNotice] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState(initialData.period.customStart ?? initialData.period.range.startDay);
  const [customEnd, setCustomEnd] = useState(initialData.period.customEnd ?? initialData.period.range.endDay);
  const [customError, setCustomError] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  useEffect(() => {
    setData(initialData);
    setGoalInput(String(initialData.goal.targetBooks || 24));
  }, [initialData]);

  const isEmpty = data.metrics.totalPages === 0 && data.metrics.totalPagesRead === 0 && data.metrics.totalSeconds === 0 && data.metrics.completedBooks === 0;
  const currentDay = useMemo(() => calendarDayKeyFromDate(new Date()), []);
  const activeView = data.period.view;

  function pushParams(next: { view?: ReadingAnalyticsView; year?: number; month?: number; weekStart?: string; customStart?: string; customEnd?: string; status?: ReadingAnalyticsStatus }) {
    const params = new URLSearchParams();
    const view = next.view ?? data.period.view;
    params.set("view", view);
    params.set("year", String(next.year ?? data.period.year));
    params.set("status", next.status ?? data.status);
    if (view === "monthly") params.set("month", String(next.month ?? data.period.month ?? 1));
    if (view === "weekly") params.set("weekStart", next.weekStart ?? data.period.weekStart ?? data.period.range.startDay);
    if (view === "custom") {
      params.set("customStart", next.customStart ?? data.period.customStart ?? customStart);
      params.set("customEnd", next.customEnd ?? data.period.customEnd ?? customEnd);
    }
    router.push(`/${locale}/stats?${params.toString()}`);
  }

  function selectView(view: ReadingAnalyticsView) {
    if (view === "custom") {
      setCustomError(false);
      setCustomOpen(true);
      return;
    }
    pushParams({ view });
  }

  function navigatePeriod(amount: number) {
    if (activeView === "annual") {
      const year = data.period.year + amount;
      if (year >= 2000 && year <= 2100 && year <= Number(currentDay.slice(0, 4))) pushParams({ year });
      return;
    }
    if (activeView === "monthly" && data.period.month) {
      const next = shiftMonth(data.period.year, data.period.month, amount);
      if (next.year >= 2000 && next.year <= 2100 && (next.year < Number(currentDay.slice(0, 4)) || next.month <= Number(currentDay.slice(5, 7)))) pushParams(next);
      return;
    }
    if (activeView === "weekly" && data.period.weekStart) {
      const next = dayToDate(data.period.weekStart);
      next.setUTCDate(next.getUTCDate() + amount * 7);
      const nextDay = dateToDay(next);
      if (nextDay <= currentDay) pushParams({ weekStart: nextDay });
    }
  }

  function applyCustomRange() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(customStart) || !/^\d{4}-\d{2}-\d{2}$/.test(customEnd) || customStart > customEnd || customStart < "2020-01-01" || customEnd > currentDay) {
      setCustomError(true);
      return;
    }
    setCustomError(false);
    setCustomOpen(false);
    pushParams({ view: "custom", customStart, customEnd });
  }

  async function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetBooks = Number(goalInput);
    if (!Number.isInteger(targetBooks) || targetBooks < 1 || targetBooks > 999) {
      setGoalError(true);
      return;
    }
    setGoalSaving(true);
    setGoalError(false);
    setGoalNotice(null);
    try {
      const response = await fetch("/api/consumer/charts-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, year: data.period.year, targetBooks }),
      });
      const body = await response.json() as { targetBooks?: number };
      if (!response.ok || body.targetBooks !== targetBooks) {
        setGoalError(true);
        return;
      }
      setData((current) => ({ ...current, goal: { ...current.goal, targetBooks } }));
      setGoalOpen(false);
      setGoalNotice(t("stats.goal.saved"));
      router.refresh();
    } catch {
      setGoalError(true);
    } finally {
      setGoalSaving(false);
    }
  }

  async function shareStats() {
    const text = shareText(data, locale);
    const url = window.location.href;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: t("stats.shareCardTitle"), text, url });
        setShareNotice(t("stats.share"));
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setShareNotice(t("stats.shareCancelled"));
        return;
      }
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setShareNotice(t("stats.shareCopied"));
        return;
      }
    } catch {
      // Download is the browser fallback when clipboard permission is unavailable.
    }
    try {
      const blob = new Blob([`${text}\n${url}`], { type: "text/plain;charset=utf-8" });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "bookgolas-reading-stats.txt";
      link.click();
      URL.revokeObjectURL(downloadUrl);
      setShareNotice(t("stats.shareDownloaded"));
    } catch {
      setShareNotice(t("stats.shareFailed"));
    }
  }

  const periodLabel = activeView === "annual"
    ? String(data.period.year)
    : activeView === "monthly" && data.period.month
      ? new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "long", timeZone: "UTC" }).format(dayToDate(monthDay(data.period.year, data.period.month)))
      : activeView === "weekly" && data.period.weekStart
        ? `${formatDay(data.period.weekStart, locale)} – ${formatDay(data.period.range.endDay, locale)}`
        : `${formatDay(data.period.range.startDay, locale)} – ${formatDay(data.period.range.endDay, locale)}`;

  const m = data.metrics;
  const goalRate = data.goal.targetBooks > 0 ? Math.round(data.goal.progressRate * 100) : 0;

  return (
    <main
      className="bookgolas-consumer-page min-h-[70dvh] bg-[var(--blab-surface-scaffold)] px-4 py-8 text-[var(--blab-text-primary)] sm:px-6 lg:px-8 lg:py-12"
      data-testid="stats-page"
      data-route-state={data.freshness === "stale" ? "stale" : "ready"}
      data-stats-view={activeView}
      data-stats-status={data.status}
      data-stats-timezone={data.timeZone}
    >
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-[var(--blab-color-primary)]"><BarChart3 aria-hidden="true" size={17} />{t("stats.eyebrow")}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl" data-testid="stats-title">{t("stats.title")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("stats.description")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setGoalInput(String(data.goal.targetBooks || 24)); setGoalOpen(true); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--blab-glass-border)] px-4 py-2 text-sm font-semibold text-[var(--blab-text-secondary)] hover:bg-[var(--blab-glass-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" data-testid="stats-goal-open">
              <Target aria-hidden="true" size={17} />{data.goal.targetBooks > 0 ? t("stats.goal.edit") : t("stats.goal.set")}
            </button>
            <button type="button" onClick={shareStats} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" data-testid="stats-share-button">
              <Share2 aria-hidden="true" size={17} />{t("stats.share")}
            </button>
          </div>
        </header>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] px-4 py-3 text-sm text-[var(--blab-text-secondary)]" data-testid="stats-timezone">
          <span><span className="mr-2 text-xs uppercase tracking-[0.16em] text-[var(--blab-text-tertiary)]">{t("stats.timezoneLabel")}</span>{t("stats.timezoneValue")}</span>
          <span data-testid="stats-period-label">{periodLabel}</span>
        </div>

        {data.freshness === "stale" ? <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100" data-testid="stats-stale">{t("stats.stale")}</p> : null}
        {goalNotice ? <p className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100" data-testid="stats-goal-saved">{goalNotice}</p> : null}
        {shareNotice ? <p className="mt-4 rounded-xl border border-[var(--blab-color-primary)]/30 bg-[var(--blab-color-primary)]/10 px-4 py-3 text-sm" data-testid="stats-share-result">{shareNotice}</p> : null}

        <section className="mt-6 rounded-[var(--blab-radius-card)] border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-4 shadow-[var(--blab-elevation-surface)] sm:p-6" data-testid="stats-controls">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("stats.views.label")} data-testid="stats-periods">
              {(["annual", "monthly", "weekly", "custom"] as const).map((view) => (
                <button key={view} type="button" onClick={() => selectView(view)} aria-pressed={activeView === view} className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)] ${activeView === view ? "border-[var(--blab-color-primary)] bg-[var(--blab-color-primary)] text-white" : "border-[var(--blab-glass-border)] text-[var(--blab-text-secondary)] hover:bg-[var(--blab-glass-fill)]"}`} data-testid={`stats-period-${view}`}>
                  {t(`stats.views.${view}`)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("stats.status.label")} data-testid="stats-status-filter">
              {(["all", "reading", "completed"] as const).map((status) => (
                <button key={status} type="button" onClick={() => pushParams({ status })} aria-pressed={data.status === status} className={`min-h-10 rounded-xl px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)] ${data.status === status ? "bg-[var(--blab-glass-fill)] font-semibold text-[var(--blab-color-primary)]" : "text-[var(--blab-text-tertiary)] hover:bg-[var(--blab-glass-fill)]"}`} data-testid={`stats-status-${status}`}>
                  {t(`stats.status.${status}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 flex items-center justify-center gap-3" data-testid="stats-period-navigation">
            {activeView !== "custom" ? <button type="button" onClick={() => navigatePeriod(-1)} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-[var(--blab-glass-border)] hover:bg-[var(--blab-glass-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" aria-label={t("stats.period.previous")} data-testid="stats-period-previous"><ChevronLeft aria-hidden="true" size={19} /></button> : null}
            <span className="min-w-40 text-center text-lg font-semibold" data-testid="stats-period-title">{periodLabel}</span>
            {activeView !== "custom" ? <button type="button" onClick={() => navigatePeriod(1)} disabled={periodLabel === String(currentDay.slice(0, 4))} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-[var(--blab-glass-border)] hover:bg-[var(--blab-glass-fill)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" aria-label={t("stats.period.next")} data-testid="stats-period-next"><ChevronRight aria-hidden="true" size={19} /></button> : null}
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-2 border-b border-[var(--blab-glass-border)]" role="tablist" aria-label={t("stats.tabs.label")} data-testid="stats-tabs">
          {(["overview", "analysis", "activity"] as const).map((item) => (
            <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`min-h-12 border-b-2 px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)] ${tab === item ? "border-[var(--blab-color-primary)] text-[var(--blab-color-primary)]" : "border-transparent text-[var(--blab-text-tertiary)] hover:text-[var(--blab-text-primary)]"}`} data-testid={`stats-tab-${item}`}>
              {t(`stats.tabs.${item}`)}
            </button>
          ))}
        </div>

        {isEmpty ? (
          <section className="mt-6 rounded-[var(--blab-radius-card)] border border-dashed border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] px-5 py-12 text-center" data-testid="stats-empty">
            <Gift aria-hidden="true" className="mx-auto text-[var(--blab-color-primary)]" size={38} />
            <h2 className="mt-4 text-xl font-semibold">{t("stats.emptyTitle")}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("stats.emptyDescription")}</p>
          </section>
        ) : null}

        <section className={isEmpty ? "mt-6 opacity-70" : "mt-6"} aria-label={t("stats.tabs.overview")}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="stats-metrics">
            <MetricCard testId="stats-metric-pages-read" label={t("stats.metrics.pagesRead")} value={`${shortNumber(m.totalPagesRead, locale)}p`} detail={`${shortNumber(m.totalPages, locale)}p ${t("stats.metrics.totalPages")}`} icon={<BarChart3 aria-hidden="true" size={17} />} />
            <MetricCard testId="stats-metric-reading-time" label={t("stats.metrics.readingTime")} value={formatDuration(m.totalSeconds, locale)} detail={`${shortNumber(m.activeDays, locale)} ${t("stats.metrics.activeDays")}`} icon={<Clock3 aria-hidden="true" size={17} />} />
            <MetricCard testId="stats-metric-streak" label={t("stats.metrics.streak")} value={`${shortNumber(m.currentStreak, locale)}${locale === "ko" ? "일" : "d"}`} detail={`${numberFormat(m.averageDailyPages, locale)}p ${t("stats.metrics.averageDaily")}`} icon={<Flame aria-hidden="true" size={17} />} />
            <MetricCard testId="stats-metric-completion" label={t("stats.metrics.completionRate")} value={`${numberFormat(m.completionRate, locale)}%`} detail={`${m.completedBooks}/${m.totalStarted} ${t("stats.metrics.completed")}`} icon={<CheckCircle2 aria-hidden="true" size={17} />} />
          </div>

          <article className="mt-4 rounded-[var(--blab-radius-card)] border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-5 sm:p-6" data-testid="stats-goal-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--blab-color-primary)]/10 text-[var(--blab-color-primary)]"><Flag aria-hidden="true" size={22} /></span><div><p className="text-sm font-medium text-[var(--blab-color-primary)]">{data.goal.year}</p><h2 className="mt-1 text-xl font-semibold">{t("stats.goal.title")}</h2></div></div>
              <button type="button" onClick={() => { setGoalInput(String(data.goal.targetBooks || 24)); setGoalOpen(true); }} className="min-h-11 rounded-xl border border-[var(--blab-glass-border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--blab-glass-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" data-testid="stats-goal-edit">{data.goal.targetBooks > 0 ? t("stats.goal.edit") : t("stats.goal.set")}</button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div><p className="text-xs text-[var(--blab-text-tertiary)]">{t("stats.goal.completed")}</p><p className="mt-1 text-2xl font-bold" data-testid="stats-goal-completed">{data.goal.completedBooks} / {data.goal.targetBooks}</p></div>
              <div><p className="text-xs text-[var(--blab-text-tertiary)]">{t("stats.goal.remaining")}</p><p className="mt-1 text-2xl font-bold">{data.goal.remainingBooks}</p></div>
              <div><p className="text-xs text-[var(--blab-text-tertiary)]">{t("stats.goal.daysLeft")}</p><p className="mt-1 text-2xl font-bold">{data.goal.daysLeftInYear}</p></div>
            </div>
            <div className="mt-5"><div className="flex items-center justify-between text-sm"><span>{goalRate}%</span><span className="text-[var(--blab-text-tertiary)]">{data.goal.booksPerMonth} {t("stats.goal.perMonth")}</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-[var(--blab-glass-fill)]"><div className="h-full rounded-full bg-[var(--blab-color-primary)] transition-all" style={{ width: `${goalRate}%` }} /></div><p className="mt-3 text-sm text-[var(--blab-text-secondary)]">{data.goal.isOnTrack ? t("stats.goal.onTrack") : t("stats.goal.offTrack")}</p></div>
          </article>

          {tab === "overview" ? (
            <article className="mt-4 rounded-[var(--blab-radius-card)] border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-5 sm:p-6" data-testid="stats-period-chart">
              <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-[var(--blab-color-primary)]">{t("stats.activity.seriesTitle")}</p><h2 className="mt-1 text-xl font-semibold">{periodLabel}</h2></div><CalendarDays aria-hidden="true" className="text-[var(--blab-color-primary)]" size={22} /></div>
              <div className="mt-6 grid gap-2" data-testid="stats-period-series">{data.periods.map((point) => { const max = Math.max(...data.periods.map((item) => item.pages), 1); return <div key={point.key} className="grid grid-cols-[5rem_minmax(0,1fr)_4rem] items-center gap-3 text-sm"><span className="truncate text-[var(--blab-text-tertiary)]">{point.key}</span><div className="h-3 overflow-hidden rounded-full bg-[var(--blab-glass-fill)]"><div className="h-full rounded-full bg-[var(--blab-color-primary)]" style={{ width: `${Math.max(0, (point.pages / max) * 100)}%` }} /></div><span className="text-right tabular-nums">{point.pages}p</span></div>; })}</div>
            </article>
          ) : null}

          {tab === "analysis" ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-2" data-testid="stats-analysis-content">
              <article className="rounded-[var(--blab-radius-card)] border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-5 sm:p-6" data-testid="stats-completion-card"><div className="flex items-center gap-3"><CheckCircle2 className="text-[var(--blab-color-primary)]" size={22} /><div><h2 className="text-xl font-semibold">{t("stats.analysis.completionTitle")}</h2><p className="mt-1 text-sm text-[var(--blab-text-tertiary)]">{t("stats.analysis.completionDescription")}</p></div></div><div className="mt-6 grid grid-cols-2 gap-3">{[[t("stats.metrics.started"), m.totalStarted], [t("stats.metrics.completed"), m.completedBooks], [t("stats.metrics.inProgress"), m.inProgressBooks], [t("stats.metrics.abandoned"), m.abandonedBooks]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-[var(--blab-glass-fill)] p-3"><p className="text-xs text-[var(--blab-text-tertiary)]">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}</div></article>
              <article className="rounded-[var(--blab-radius-card)] border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-5 sm:p-6" data-testid="stats-genre-card"><h2 className="text-xl font-semibold">{t("stats.analysis.genreTitle")}</h2>{data.genreDistribution.length === 0 ? <p className="mt-6 text-sm text-[var(--blab-text-tertiary)]">{t("stats.analysis.genreEmpty")}</p> : <div className="mt-5 space-y-4">{data.genreDistribution.map((entry) => { const total = data.genreDistribution.reduce((sum, item) => sum + item.count, 0); return <div key={entry.genre}><div className="flex justify-between gap-3 text-sm"><span>{entry.genre === "Uncategorized" && locale === "ko" ? "미분류" : entry.genre}</span><span className="tabular-nums text-[var(--blab-text-tertiary)]">{entry.count}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--blab-glass-fill)]"><div className="h-full rounded-full bg-[var(--blab-color-primary)]" style={{ width: `${(entry.count / total) * 100}%` }} /></div></div>; })}</div>}</article>
              <article className="rounded-[var(--blab-radius-card)] border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-5 sm:p-6 lg:col-span-2" data-testid="stats-monthly-books"><h2 className="text-xl font-semibold">{t("stats.analysis.monthlyTitle")}</h2><div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-12">{data.monthlyBookCounts.map((entry) => { const max = Math.max(...data.monthlyBookCounts.map((item) => item.count), 1); return <div key={entry.month} className="grid gap-2 text-center text-xs"><div className="flex h-32 items-end justify-center rounded-xl bg-[var(--blab-glass-fill)] p-1"><div className="w-full rounded-lg bg-[var(--blab-color-primary)]" style={{ height: `${Math.max(entry.count > 0 ? 8 : 0, (entry.count / max) * 100)}%` }} title={t("stats.analysis.count", { count: entry.count })} /></div><span className="text-[var(--blab-text-tertiary)]">{t("stats.analysis.month", { month: entry.month })}</span><strong>{entry.count}</strong></div>; })}</div></article>
            </div>
          ) : null}

          {tab === "activity" ? (
            <div className="mt-4 grid gap-4" data-testid="stats-activity-content">
              <article className="rounded-[var(--blab-radius-card)] border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-5 sm:p-6" data-testid="stats-heatmap"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{t("stats.activity.heatmapTitle", { year: data.period.year })}</h2><p className="mt-1 text-sm text-[var(--blab-text-tertiary)]">{t("stats.activity.heatmapDescription")}</p></div><Flame className="text-[var(--blab-color-primary)]" size={22} /></div><div className="mt-5 overflow-x-auto pb-2"><div className="grid auto-cols-[0.75rem] grid-flow-col grid-rows-7 gap-1" role="grid" aria-label={t("stats.activity.heatmapTitle", { year: data.period.year })}>{data.heatmap.map((point) => <span key={point.day} role="gridcell" title={`${formatDay(point.day, locale)} · ${point.pagesRead}p`} data-testid={`stats-heatmap-${point.day}`} className={`h-3 w-3 rounded-sm ${point.intensity === 0 ? "bg-[var(--blab-glass-fill)]" : point.intensity === 1 ? "bg-emerald-200/40" : point.intensity === 2 ? "bg-emerald-300/60" : point.intensity === 3 ? "bg-emerald-400/80" : "bg-emerald-500"}`} />)}</div></div><div className="mt-4 flex items-center justify-end gap-2 text-xs text-[var(--blab-text-tertiary)]"><span>{t("stats.activity.legendLess")}</span><span className="h-3 w-3 rounded-sm bg-[var(--blab-glass-fill)]" /><span className="h-3 w-3 rounded-sm bg-emerald-300/60" /><span className="h-3 w-3 rounded-sm bg-emerald-500" /><span>{t("stats.activity.legendMore")}</span></div></article>
              <article className="rounded-[var(--blab-radius-card)] border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-5 sm:p-6" data-testid="stats-activity-series"><h2 className="text-xl font-semibold">{t("stats.activity.seriesTitle")}</h2><div className="mt-4 divide-y divide-[var(--blab-glass-border)]">{data.daily.filter((point) => point.pagesRead > 0 || point.seconds > 0).slice(-31).reverse().map((point) => <div key={point.day} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-3 text-sm"><span>{formatDay(point.day, locale)}</span><span className="tabular-nums text-[var(--blab-text-secondary)]">{t("stats.activity.pages", { pages: point.pagesRead })}</span><span className="tabular-nums text-[var(--blab-text-tertiary)]">{t("stats.activity.minutes", { minutes: Math.round(point.seconds / 60) })}</span></div>)}</div></article>
            </div>
          ) : null}
        </section>

        <article id="stats-share-card" className="mt-6 rounded-[var(--blab-radius-card)] border border-[var(--blab-color-primary)]/30 bg-[linear-gradient(135deg,var(--blab-surface-card),var(--blab-color-primary)/10)] p-5 sm:p-6" data-testid="stats-share-card"><div className="flex items-center gap-3"><Share2 className="text-[var(--blab-color-primary)]" size={22} /><div><h2 className="text-lg font-semibold">{t("stats.shareCardTitle")}</h2><p className="mt-1 text-sm text-[var(--blab-text-tertiary)]">{t("stats.shareCardDescription")}</p></div></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><div><p className="text-xs text-[var(--blab-text-tertiary)]">{t("stats.metrics.pagesRead")}</p><p className="mt-1 text-xl font-bold">{m.totalPagesRead}p</p></div><div><p className="text-xs text-[var(--blab-text-tertiary)]">{t("stats.metrics.completed")}</p><p className="mt-1 text-xl font-bold">{m.completedBooks}</p></div><div><p className="text-xs text-[var(--blab-text-tertiary)]">{t("stats.metrics.activeDays")}</p><p className="mt-1 text-xl font-bold">{m.activeDays}</p></div><div><p className="text-xs text-[var(--blab-text-tertiary)]">{t("stats.metrics.streak")}</p><p className="mt-1 text-xl font-bold">{m.currentStreak}</p></div></div></article>
      </div>

      {goalOpen ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" data-testid="stats-goal-dialog-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="stats-goal-dialog-title" className="w-full max-w-md rounded-[var(--blab-radius-card)] border border-[var(--blab-glass-border)] bg-[var(--blab-surface-elevated)] p-5 text-[var(--blab-text-primary)] shadow-[var(--blab-elevation-overlay)]" data-testid="stats-goal-dialog"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-[var(--blab-color-primary)]">{data.goal.year}</p><h2 id="stats-goal-dialog-title" className="mt-1 text-xl font-semibold">{t("stats.goal.dialogTitle", { year: data.goal.year })}</h2><p className="mt-2 text-sm text-[var(--blab-text-tertiary)]">{t("stats.goal.dialogDescription")}</p></div><button type="button" onClick={() => setGoalOpen(false)} aria-label={t("stats.goal.cancel")} className="grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-[var(--blab-glass-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]"><X aria-hidden="true" size={19} /></button></div><form className="mt-6" onSubmit={saveGoal}><label htmlFor="stats-goal-input" className="text-sm font-medium">{t("stats.goal.inputLabel")}</label><input id="stats-goal-input" data-testid="stats-goal-input" type="number" min="1" max="999" value={goalInput} onChange={(event) => setGoalInput(event.target.value)} placeholder={t("stats.goal.inputPlaceholder")} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" aria-invalid={goalError} />{goalError ? <p className="mt-2 text-sm text-rose-300">{t("stats.goal.error")}</p> : null}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setGoalOpen(false)} className="min-h-11 rounded-xl px-4 py-2 text-sm text-[var(--blab-text-secondary)] hover:bg-[var(--blab-glass-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]">{t("stats.goal.cancel")}</button><button type="submit" disabled={goalSaving} className="min-h-11 rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" data-testid="stats-goal-save">{goalSaving ? t("stats.goal.saving") : t("stats.goal.save")}</button></div></form></section></div> : null}
      {customOpen ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" data-testid="stats-custom-range-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="stats-custom-dialog-title" className="w-full max-w-md rounded-[var(--blab-radius-card)] border border-[var(--blab-glass-border)] bg-[var(--blab-surface-elevated)] p-5 text-[var(--blab-text-primary)] shadow-[var(--blab-elevation-overlay)]" data-testid="stats-custom-range-dialog"><div className="flex items-start justify-between gap-4"><div><h2 id="stats-custom-dialog-title" className="text-xl font-semibold">{t("stats.period.chooseRange")}</h2><p className="mt-2 text-sm text-[var(--blab-text-tertiary)]">{t("stats.period.rangeLabel")}</p></div><button type="button" onClick={() => setCustomOpen(false)} aria-label={t("stats.period.cancel")} className="grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-[var(--blab-glass-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]"><X aria-hidden="true" size={19} /></button></div><div className="mt-5 grid gap-4"><label className="grid gap-2 text-sm font-medium">{t("stats.period.start")}<input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} min="2020-01-01" max={currentDay} className="min-h-12 rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] px-3 outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" data-testid="stats-custom-start" /></label><label className="grid gap-2 text-sm font-medium">{t("stats.period.end")}<input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} min="2020-01-01" max={currentDay} className="min-h-12 rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] px-3 outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" data-testid="stats-custom-end" /></label></div>{customError ? <p className="mt-3 text-sm text-rose-300" data-testid="stats-invalid-range">{t("stats.invalidRange")}</p> : null}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setCustomOpen(false)} className="min-h-11 rounded-xl px-4 py-2 text-sm text-[var(--blab-text-secondary)] hover:bg-[var(--blab-glass-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]">{t("stats.period.cancel")}</button><button type="button" onClick={applyCustomRange} className="min-h-11 rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" data-testid="stats-custom-apply">{t("stats.period.apply")}</button></div></section></div> : null}
    </main>
  );
}
