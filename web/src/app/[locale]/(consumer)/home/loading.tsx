import { getTranslations } from "next-intl/server";
import { ConsumerLoadingState } from "@/components/consumer/blab-primitives";

export default async function ConsumerHomeLoading() {
  const t = await getTranslations("consumer");

  return (
    <main className="min-h-[70dvh] px-4 py-12 sm:px-6" aria-busy="true" data-route-state="pending">
      <div className="mx-auto max-w-6xl">
        <ConsumerLoadingState label={t("states.loading")} />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-56 animate-pulse rounded-3xl border border-[var(--blab-glass-border)] bg-[var(--blab-glass-fill)]"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
