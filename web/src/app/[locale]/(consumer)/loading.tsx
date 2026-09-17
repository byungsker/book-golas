import { getTranslations } from "next-intl/server";
import { ConsumerLoadingState } from "@/components/consumer/blab-primitives";

export default async function ConsumerRouteLoading() {
  const t = await getTranslations("consumer");

  return (
    <main
      className="flex min-h-[70dvh] items-center justify-center px-[var(--blab-space-lg)]"
      aria-busy="true"
      data-route-state="pending"
    >
      <ConsumerLoadingState label={t("states.loading")} />
    </main>
  );
}
