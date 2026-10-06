import Link from "next/link";
import type { AppLocale } from "@/shared/config";
import { getConsumerPath } from "@/shared/routing";
import { homeBookListViews, type HomeBookListView } from "../model/home-book-filter";

type HomeBookFilterProps = {
  locale: AppLocale;
  view: HomeBookListView;
  labels: Record<HomeBookListView, string>;
  ariaLabel: string;
};

export function HomeBookFilter({ locale, view, labels, ariaLabel }: HomeBookFilterProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] p-2 sm:grid-cols-5"
      data-testid="home-status-tabs"
    >
      {homeBookListViews.map((filterView) => (
        <Link
          key={filterView}
          href={getConsumerPath(locale, `/home?view=${filterView}`)}
          aria-current={filterView === view ? "page" : undefined}
          data-testid={`home-status-tab-${filterView}`}
          className={`inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)] ${filterView === view ? "bg-[var(--blab-color-primary)] text-white" : "text-[var(--blab-text-secondary)] hover:bg-[var(--blab-glass-fill)]"}`}
        >
          {labels[filterView]}
        </Link>
      ))}
    </nav>
  );
}
