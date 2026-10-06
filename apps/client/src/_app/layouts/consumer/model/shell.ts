export const consumerShellTabs = [
  { id: "home", path: "/home" },
  { id: "library", path: "/library" },
  { id: "stats", path: "/stats" },
  { id: "calendar", path: "/calendar" },
  { id: "account", path: "/account" },
] as const;

export type ConsumerShellTab = (typeof consumerShellTabs)[number]["id"];

export const homeViews = ["reading", "planned", "completed", "paused", "all"] as const;
export const chartViews = ["progress", "pages", "time"] as const;

function isValueInList<T extends string>(value: string | null, values: readonly T[]): value is T {
  return value !== null && values.includes(value as T);
}

export function getActiveConsumerTab(pathname: string): ConsumerShellTab | null {
  const match = pathname.match(/^\/(?:ko|en)\/(home|library|stats|calendar|account)\/?$/);
  return match ? match[1] as ConsumerShellTab : null;
}

export function getHomeView(value: string | null): (typeof homeViews)[number] {
  return isValueInList(value, homeViews) ? value : homeViews[0];
}

export function getChartView(value: string | null): (typeof chartViews)[number] {
  return isValueInList(value, chartViews) ? value : chartViews[0];
}

export function getNextCycledPath(
  locale: string,
  tab: ConsumerShellTab,
  searchParams: URLSearchParams,
): string | null {
  const values = tab === "home" ? homeViews : tab === "stats" ? chartViews : null;
  if (!values) return null;

  const current = tab === "home"
    ? getHomeView(searchParams.get("view"))
    : getChartView(searchParams.get("view"));
  const next = values[(values.indexOf(current as never) + 1) % values.length];
  const nextSearchParams = new URLSearchParams(searchParams);
  nextSearchParams.set("view", next);
  return `/${locale}/${tab}?${nextSearchParams.toString()}`;
}
