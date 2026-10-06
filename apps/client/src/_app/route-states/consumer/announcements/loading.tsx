import { getTranslations } from "next-intl/server";
import { ConsumerLoadingState } from "@/shared/ui";

export default async function AnnouncementsLoading() {
  const t = await getTranslations("consumer.announcements");
  return <main className="flex min-h-[70dvh] items-center justify-center px-[var(--blab-space-lg)]" aria-busy="true" data-route-state="pending" data-testid="consumer-announcements-loading"><ConsumerLoadingState label={t("loading")} /></main>;
}
