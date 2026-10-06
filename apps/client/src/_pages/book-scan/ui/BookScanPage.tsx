import { redirect } from "next/navigation";
import { BookDiscoveryClient } from "@/features/book-discovery";
import { ConsumerHeader } from "@/widgets/consumer-header";
import { isConsumerLocale, type ConsumerLocale } from "@/shared/routing";

export type BookScanPageProps = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export default async function BookScanPage({ params }: BookScanPageProps) {
  const { locale } = await params;
  if (!isConsumerLocale(locale)) redirect("/ko/auth/sign-in");

  return (
    <div className="bookgolas-consumer-page min-h-screen bg-[var(--blab-surface-scaffold)] text-[var(--blab-text-primary)]">
      <ConsumerHeader locale={locale as ConsumerLocale} authenticated />
      <BookDiscoveryClient locale={locale as ConsumerLocale} autoOpenScanner />
    </div>
  );
}
