import { getTranslations } from "next-intl/server";
import { ConsumerLoadingState } from "@/components/consumer/blab-primitives";

export default async function NewBookLoading() {
  const t = await getTranslations("consumer");

  return (
    <main className="min-h-[70dvh] px-4 py-12 sm:px-6" aria-busy="true" data-route-state="pending" data-testid="book-discovery-loading">
      <div className="mx-auto max-w-6xl">
        <ConsumerLoadingState label={t("bookDiscovery.search.loading")} />
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-3xl border border-[var(--blab-glass-border)] bg-[var(--blab-glass-fill)]" />
          <div className="h-72 animate-pulse rounded-3xl border border-[var(--blab-glass-border)] bg-[var(--blab-glass-fill)]" />
        </div>
      </div>
    </main>
  );
}
