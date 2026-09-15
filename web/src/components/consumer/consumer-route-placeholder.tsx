import { getTranslations } from "next-intl/server";
import { ConsumerHeader } from "@/components/consumer/consumer-header";
import { ConsumerCard, ConsumerEmptyState } from "@/components/consumer/blab-primitives";
import type { ConsumerLocale } from "@/lib/consumer/paths";
import { fetchOwnedBook } from "@/lib/consumer/queries";

type PlaceholderKey =
  | "announcements"
  | "onboarding"
  | "library"
  | "stats"
  | "calendar"
  | "accountNotifications"
  | "bookList"
  | "newBook"
  | "review"
  | "mindMap"
  | "scan"
  | "subscription";

export async function ConsumerRoutePlaceholder({
  locale,
  titleKey,
}: {
  locale: ConsumerLocale;
  titleKey: PlaceholderKey;
}) {
  const t = await getTranslations("consumer.routes");

  return (
    <div className="bookgolas-consumer-page min-h-screen bg-[var(--blab-surface-scaffold)] text-[var(--blab-text-primary)]">
      <ConsumerHeader locale={locale} authenticated />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <ConsumerCard data-testid={`consumer-route-${titleKey}`}>
          <ConsumerEmptyState
            title={t(`${titleKey}.title`)}
            message={t(`${titleKey}.description`)}
          />
        </ConsumerCard>
      </main>
    </div>
  );
}

export async function OwnedBookRoutePlaceholder({
  locale,
  bookId,
  titleKey,
}: {
  locale: ConsumerLocale;
  bookId: string;
  titleKey: "review" | "mindMap";
}) {
  const result = await fetchOwnedBook(bookId);
  if (result.code === "ok" && result.book) {
    return <ConsumerRoutePlaceholder locale={locale} titleKey={titleKey} />;
  }

  const t = await getTranslations("consumer");
  const unavailable = result.code === "unavailable";

  return (
    <div
      className="bookgolas-consumer-page min-h-screen bg-[var(--blab-surface-scaffold)] text-[var(--blab-text-primary)]"
      data-route-state={unavailable ? "unavailable" : "not-found-or-forbidden"}
    >
      <ConsumerHeader locale={locale} authenticated={result.authenticated} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
        <ConsumerCard>
          <ConsumerEmptyState
            title={unavailable ? t("states.errorTitle") : t("states.permissionTitle")}
            message={unavailable ? t("states.errorDescription") : t("states.permissionDescription")}
          />
        </ConsumerCard>
      </main>
    </div>
  );
}
