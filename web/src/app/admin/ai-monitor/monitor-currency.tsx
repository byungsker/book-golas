import Link from "next/link";
import { Button } from "@/components/ui/button";

export type CostCurrency = "usd" | "krw";

export const DEFAULT_COST_CURRENCY: CostCurrency = "usd";
export const DISPLAY_KRW_PER_USD = 1_400;

const krwFormatter = new Intl.NumberFormat("ko-KR", {
  currency: "KRW",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

export function parseCostCurrency(value: string | null | undefined): CostCurrency {
  return value === "krw" ? "krw" : DEFAULT_COST_CURRENCY;
}

export function formatCost(value: number, currency: CostCurrency = DEFAULT_COST_CURRENCY): string {
  if (currency === "krw") return krwFormatter.format(value * DISPLAY_KRW_PER_USD);
  return `$${value.toFixed(6)}`;
}

function currencyHref(pathname: string, query: string, currency: CostCurrency): string {
  const params = new URLSearchParams(query);
  params.set("currency", currency);
  return `${pathname}?${params.toString()}`;
}

export function CostToggle({
  currency,
  pathname,
  query,
}: {
  readonly currency: CostCurrency;
  readonly pathname: string;
  readonly query: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2" role="group" aria-label="비용 표시 통화">
      <span className="text-xs text-muted-foreground">비용 표시</span>
      <div className="inline-flex rounded-md border border-border p-0.5">
        <Button asChild size="sm" variant={currency === "usd" ? "default" : "ghost"}>
          <Link href={currencyHref(pathname, query, "usd")} aria-current={currency === "usd" ? "true" : undefined}>
            USD
          </Link>
        </Button>
        <Button asChild size="sm" variant={currency === "krw" ? "default" : "ghost"}>
          <Link href={currencyHref(pathname, query, "krw")} aria-current={currency === "krw" ? "true" : undefined}>
            KRW
          </Link>
        </Button>
      </div>
      <span className="text-xs text-muted-foreground">표시 환율 $1 = ₩{DISPLAY_KRW_PER_USD.toLocaleString("ko-KR")}</span>
    </div>
  );
}
