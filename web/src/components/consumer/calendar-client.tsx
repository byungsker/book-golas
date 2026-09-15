"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  PauseCircle,
  X,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import {
  CALENDAR_TIME_ZONE,
  calendarDateFromDayKey,
  calendarDayKeyFromDate,
  getCalendarGridDays,
  type CalendarData,
  type CalendarDay,
  type CalendarFilter,
  type CalendarBookDay,
} from "@/lib/product/contracts";
import type { ConsumerLocale } from "@/lib/consumer/paths";

function monthValue(year: number, month: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

function monthFromValue(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  return { year, month };
}

function moveMonth(year: number, month: number, amount: number): { year: number; month: number } {
  const next = new Date(Date.UTC(year, month - 1 + amount, 1, 12));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 };
}

function formatDay(day: string, locale: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: CALENDAR_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  }).format(calendarDateFromDayKey(day));
}

function formatEventTime(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: CALENDAR_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(seconds: number, locale: string): string {
  if (seconds <= 0) return new Intl.NumberFormat(locale).format(0);
  const minutes = Math.round(seconds / 60);
  return new Intl.NumberFormat(locale).format(minutes);
}

function statusIcon(status: CalendarBookDay["status"]) {
  if (status === "completed") return <CheckCircle2 aria-hidden="true" size={14} />;
  if (status === "will_retry") return <PauseCircle aria-hidden="true" size={14} />;
  if (status === "planned") return <CalendarClock aria-hidden="true" size={14} />;
  return <BookOpen aria-hidden="true" size={14} />;
}

function CalendarDayCell({
  day,
  currentMonth,
  today,
  data,
  onSelect,
  locale,
  t,
}: {
  day: string;
  currentMonth: string;
  today: string;
  data: CalendarDay | undefined;
  onSelect: (day: CalendarDay) => void;
  locale: ConsumerLocale;
  t: ReturnType<typeof useTranslations<"consumer">>;
}) {
  const isOutside = !day.startsWith(`${currentMonth}-`);
  const isToday = day === today;
  const hasActivity = Boolean(data);
  return (
    <button
      type="button"
      disabled={!data}
      onClick={() => data && onSelect(data)}
      className={`group relative min-h-24 rounded-2xl border p-2 text-left transition sm:min-h-28 ${
        isToday
          ? "border-[var(--blab-color-primary)] bg-[var(--blab-color-primary)]/10"
          : "border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)]"
      } ${data ? "hover:-translate-y-0.5 hover:border-[var(--blab-color-primary)] hover:shadow-[var(--blab-elevation-surface)]" : "cursor-default"} ${isOutside ? "opacity-45" : ""}`}
      aria-label={
        data
          ? t("calendar.dayWithActivity", {
              date: formatDay(day, locale),
              count: data.books.length,
            })
          : t("calendar.dayWithoutActivity", { date: formatDay(day, locale) })
      }
      data-testid={`calendar-day-${day}`}
      data-calendar-has-activity={hasActivity ? "true" : "false"}
      data-calendar-book-count={data?.books.length ?? 0}
      data-calendar-today={isToday ? "true" : "false"}
    >
      <span className={`text-sm font-semibold ${isToday ? "text-[var(--blab-color-primary)]" : "text-[var(--blab-text-primary)]"}`}>
        {Number(day.slice(-2))}
      </span>
      {data ? (
        <span className="mt-3 flex min-w-0 items-center gap-2 rounded-xl bg-[var(--blab-glass-fill)] px-2 py-2 text-[var(--blab-text-secondary)]">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--blab-color-primary)]/15 text-[var(--blab-color-primary)]">
            {statusIcon(data.books[0].status)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold text-[var(--blab-text-primary)]">{data.books[0].title}</span>
            <span className="mt-0.5 block text-[11px] text-[var(--blab-text-tertiary)]">
              {data.books.length > 1 ? t("calendar.moreBooks", { count: data.books.length - 1 }) : data.books[0].kind === "planned" ? t("calendar.plannedMarker") : t("calendar.activeMarker")}
            </span>
          </span>
        </span>
      ) : (
        <span className="mt-4 block text-[11px] text-[var(--blab-text-tertiary)]">{t("calendar.noActivityShort")}</span>
      )}
    </button>
  );
}

function DayDetail({
  locale,
  day,
  onClose,
  t,
}: {
  locale: ConsumerLocale;
  day: CalendarDay;
  onClose: () => void;
  t: ReturnType<typeof useTranslations<"consumer">>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-day-detail-title"
        className="max-h-[85dvh] w-full overflow-y-auto rounded-t-[var(--blab-radius-card)] border border-[var(--blab-glass-border)] bg-[var(--blab-surface-elevated)] p-5 text-[var(--blab-text-primary)] shadow-[var(--blab-elevation-overlay)] sm:max-w-2xl sm:rounded-[var(--blab-radius-card)] sm:p-6"
        data-testid="calendar-day-detail"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--blab-color-primary)]">{t("calendar.dayDetailEyebrow")}</p>
            <h2 id="calendar-day-detail-title" className="mt-1 text-2xl font-semibold">{formatDay(day.day, locale)}</h2>
            <p className="mt-2 text-sm text-[var(--blab-text-tertiary)]">
              {t("calendar.daySummary", { books: day.books.length, pages: day.pagesRead })}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("calendar.closeDetail")} className="grid min-h-11 min-w-11 place-items-center rounded-full text-[var(--blab-text-tertiary)] hover:bg-[var(--blab-glass-fill)] hover:text-[var(--blab-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" data-testid="calendar-day-detail-close">
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <div className="grid gap-3" data-testid="calendar-day-books">
          {day.books.map((book) => (
            <article key={book.bookId} className="rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-4" data-testid={`calendar-day-book-${book.bookId}`} data-calendar-book-status={book.status}>
              <div className="flex items-start gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--blab-color-primary)]/15 text-[var(--blab-color-primary)]">
                  {statusIcon(book.status)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words font-semibold">{book.title}</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--blab-glass-fill)] px-2 py-1 text-[11px] text-[var(--blab-text-secondary)]">
                      {statusIcon(book.status)} {t(`calendar.status.${book.status}` as never)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--blab-text-tertiary)]">{book.author ?? t("calendar.authorUnknown")}</p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-xl bg-[var(--blab-glass-fill)] p-3">
                  <dt className="text-[var(--blab-text-tertiary)]">{t("calendar.pagesRead")}</dt>
                  <dd className="mt-1 font-semibold">{book.pagesRead}</dd>
                </div>
                <div className="rounded-xl bg-[var(--blab-glass-fill)] p-3">
                  <dt className="text-[var(--blab-text-tertiary)]">{t("calendar.sessionMinutes")}</dt>
                  <dd className="mt-1 font-semibold">{formatDuration(book.durationSeconds, locale)}</dd>
                </div>
                <div className="rounded-xl bg-[var(--blab-glass-fill)] p-3">
                  <dt className="text-[var(--blab-text-tertiary)]">{t("calendar.eventCount")}</dt>
                  <dd className="mt-1 font-semibold">{book.eventCount}</dd>
                </div>
              </dl>
              {book.kind === "planned" ? (
                <p className="mt-4 flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-100" data-testid="calendar-planned-marker">
                  <CalendarClock aria-hidden="true" size={16} />
                  {t("calendar.plannedDescription")}
                </p>
              ) : null}
              {book.events.length > 0 ? (
                <ol className="mt-4 space-y-2" data-testid={`calendar-events-${book.bookId}`}>
                  {book.events.map((event) => (
                    <li key={`${event.kind}-${event.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--blab-glass-border)] px-3 py-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2 text-[var(--blab-text-secondary)]">
                        {event.kind === "progress" ? <BookOpen aria-hidden="true" size={15} /> : <Clock3 aria-hidden="true" size={15} />}
                        <span className="truncate">{event.kind === "progress" ? t("calendar.progressEvent", { pages: event.pagesRead }) : t("calendar.sessionEvent", { minutes: formatDuration(event.durationSeconds, locale) })}</span>
                      </span>
                      <time className="shrink-0 text-xs text-[var(--blab-text-tertiary)]" dateTime={event.occurredAt}>{formatEventTime(event.occurredAt, locale)}</time>
                    </li>
                  ))}
                </ol>
              ) : null}
              <Link href={`/${locale}/books/${book.bookId}`} onClick={onClose} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" data-testid={`calendar-open-book-${book.bookId}`}>
                {t("calendar.openBook")}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export function CalendarClient({
  locale,
  initialData,
}: {
  locale: ConsumerLocale;
  initialData: CalendarData;
}) {
  const t = useTranslations("consumer");
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [monthPickerValue, setMonthPickerValue] = useState(monthValue(initialData.year, initialData.month));
  const currentMonth = monthValue(initialData.year, initialData.month);
  const today = calendarDayKeyFromDate(new Date());
  const gridDays = useMemo(() => getCalendarGridDays(initialData.year, initialData.month), [initialData.month, initialData.year]);
  const daysByKey = useMemo(() => new Map(initialData.days.map((day) => [day.day, day])), [initialData.days]);
  const filters: CalendarFilter[] = ["all", "reading", "completed"];
  const monthLabel = new Intl.DateTimeFormat(locale, { timeZone: CALENDAR_TIME_ZONE, year: "numeric", month: "long" }).format(new Date(Date.UTC(initialData.year, initialData.month - 1, 15, 12)));
  const canGoPrevious = initialData.year > 2000 || initialData.month > 1;
  const canGoNext = initialData.year < 2100 || initialData.month < 12;

  function navigate(next: { year: number; month: number; filter?: CalendarFilter }) {
    const params = new URLSearchParams();
    params.set("year", String(next.year));
    params.set("month", String(next.month));
    params.set("filter", next.filter ?? initialData.filter);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
    setSelectedDay(null);
  }

  function chooseMonth() {
    const next = monthFromValue(monthPickerValue);
    if (!next) return;
    setMonthPickerOpen(false);
    navigate({ ...next });
  }

  return (
    <main className="bookgolas-consumer-page min-h-[70dvh] bg-[var(--blab-surface-scaffold)] px-4 py-8 text-[var(--blab-text-primary)] sm:px-6 lg:px-8 lg:py-12" data-testid="calendar-page" data-route-state="ready" data-calendar-filter={initialData.filter} data-calendar-timezone={initialData.timeZone} aria-busy={isPending}>
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between" data-testid="calendar-header">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-[var(--blab-color-primary)]"><CalendarDays aria-hidden="true" size={17} />{t("calendar.eyebrow")}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl" data-testid="calendar-title">{t("calendar.title")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("calendar.description")}</p>
          </div>
          <div className="rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] px-4 py-3 text-sm text-[var(--blab-text-secondary)]" data-testid="calendar-timezone">
            <span className="block text-xs uppercase tracking-[0.16em] text-[var(--blab-text-tertiary)]">{t("calendar.timezoneLabel")}</span>
            <strong className="mt-1 block text-[var(--blab-text-primary)]">{CALENDAR_TIME_ZONE}</strong>
          </div>
        </header>

        <section className="mt-8 rounded-[var(--blab-radius-card)] border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-4 shadow-[var(--blab-elevation-surface)] sm:p-6" data-testid="calendar-panel">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button type="button" disabled={!canGoPrevious || isPending} onClick={() => navigate(moveMonth(initialData.year, initialData.month, -1))} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-[var(--blab-glass-border)] text-[var(--blab-text-secondary)] hover:bg-[var(--blab-glass-fill)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" aria-label={t("calendar.previousMonth")} data-testid="calendar-previous-month">
                <ChevronLeft aria-hidden="true" size={20} />
              </button>
              <button type="button" onClick={() => { setMonthPickerValue(currentMonth); setMonthPickerOpen(true); }} className="min-h-11 rounded-xl px-4 text-lg font-semibold hover:bg-[var(--blab-glass-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" data-testid="calendar-month-button" aria-haspopup="dialog">
                {monthLabel}
              </button>
              <button type="button" disabled={!canGoNext || isPending} onClick={() => navigate(moveMonth(initialData.year, initialData.month, 1))} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-[var(--blab-glass-border)] text-[var(--blab-text-secondary)] hover:bg-[var(--blab-glass-fill)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" aria-label={t("calendar.nextMonth")} data-testid="calendar-next-month">
                <ChevronRight aria-hidden="true" size={20} />
              </button>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-[var(--blab-text-primary)]" data-testid="calendar-monthly-book-count">{t("calendar.bookCount", { count: initialData.monthlyBookCount })}</p>
              <p className="mt-1 text-xs text-[var(--blab-text-tertiary)]">{t("calendar.activeDayCount", { count: initialData.activeDayCount })}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label={t("calendar.filterLabel")} data-testid="calendar-filters">
            {filters.map((filter) => (
              <button key={filter} type="button" onClick={() => navigate({ year: initialData.year, month: initialData.month, filter })} aria-pressed={filter === initialData.filter} data-testid={`calendar-filter-${filter}`} className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)] ${filter === initialData.filter ? "border-[var(--blab-color-primary)] bg-[var(--blab-color-primary)] text-white" : "border-[var(--blab-glass-border)] text-[var(--blab-text-secondary)] hover:bg-[var(--blab-glass-fill)]"}`}>
                {t(`calendar.filters.${filter}` as never)}
              </button>
            ))}
          </div>

          <div className="mt-6 overflow-x-auto" data-testid="calendar-grid-wrap">
            <div className="min-w-[42rem]" role="grid" aria-label={t("calendar.gridLabel")} data-testid="calendar-grid">
              <div className="grid grid-cols-7 gap-2 px-1" role="row">
                {Array.from({ length: 7 }, (_, index) => {
                  const date = new Date(Date.UTC(2026, 0, 4 + index, 12));
                  return <span key={index} role="columnheader" className="py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-[var(--blab-text-tertiary)]">{new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: CALENDAR_TIME_ZONE }).format(date)}</span>;
                })}
              </div>
              <div className="grid grid-cols-7 gap-2" role="rowgroup">
                {gridDays.map((day) => (
                  <CalendarDayCell key={day} day={day} currentMonth={currentMonth} today={today} data={daysByKey.get(day)} onSelect={setSelectedDay} locale={locale} t={t} />
                ))}
              </div>
            </div>
          </div>

          {initialData.days.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[var(--blab-glass-border)] px-5 py-8 text-center" data-testid="calendar-empty">
              <CalendarDays aria-hidden="true" className="mx-auto text-[var(--blab-color-primary)]" size={28} />
              <h2 className="mt-3 text-lg font-semibold">{t("calendar.emptyTitle")}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-[var(--blab-text-tertiary)]">{t("calendar.emptyDescription")}</p>
            </div>
          ) : null}
        </section>
      </div>

      {isPending ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/20" aria-busy="true" data-testid="calendar-navigation-loading">
          <div className="rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-elevated)] px-5 py-4 text-sm font-medium shadow-[var(--blab-elevation-overlay)]">{t("calendar.loading")}</div>
        </div>
      ) : null}

      {monthPickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setMonthPickerOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="calendar-month-picker-title" className="w-full rounded-t-[var(--blab-radius-card)] border border-[var(--blab-glass-border)] bg-[var(--blab-surface-elevated)] p-5 shadow-[var(--blab-elevation-overlay)] sm:max-w-md sm:rounded-[var(--blab-radius-card)]" data-testid="calendar-month-picker">
            <div className="flex items-center justify-between gap-4">
              <h2 id="calendar-month-picker-title" className="text-lg font-semibold">{t("calendar.monthPickerTitle")}</h2>
              <button type="button" onClick={() => setMonthPickerOpen(false)} className="grid min-h-11 min-w-11 place-items-center rounded-full text-[var(--blab-text-tertiary)] hover:bg-[var(--blab-glass-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" aria-label={t("calendar.cancelMonthPicker")}>
                <X aria-hidden="true" size={20} />
              </button>
            </div>
            <label className="mt-5 grid gap-2 text-sm font-medium" htmlFor="calendar-month-input">
              {t("calendar.monthPickerLabel")}
              <input id="calendar-month-input" type="month" value={monthPickerValue} onChange={(event) => setMonthPickerValue(event.target.value)} className="min-h-12 rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] px-3 text-base text-[var(--blab-text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" data-testid="calendar-month-input" />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setMonthPickerOpen(false)} className="min-h-11 rounded-xl px-4 py-2 text-sm font-medium text-[var(--blab-text-secondary)] hover:bg-[var(--blab-glass-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" data-testid="calendar-month-cancel">{t("calendar.cancel")}</button>
              <button type="button" onClick={chooseMonth} className="min-h-11 rounded-xl bg-[var(--blab-color-primary)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" data-testid="calendar-month-confirm">{t("calendar.confirm")}</button>
            </div>
          </section>
        </div>
      ) : null}

      {selectedDay ? <DayDetail locale={locale} day={selectedDay} onClose={() => setSelectedDay(null)} t={t} /> : null}
    </main>
  );
}
