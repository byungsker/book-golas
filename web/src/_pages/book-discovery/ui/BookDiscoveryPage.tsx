import { redirect } from "next/navigation";
import { BookDiscoveryClient } from "@/features/book-discovery";
import { ConsumerHeader } from "@/widgets/consumer-header";
import type { ConsumerLocale } from "@/shared/routing";
import { isConsumerLocale } from "@/shared/routing";

export type BookDiscoveryPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ q?: string | string[] }>;
};

export default async function BookDiscoveryPage({
  params,
  searchParams,
}: BookDiscoveryPageProps) {
  const { locale } = await params;
  if (!isConsumerLocale(locale)) redirect("/ko/auth/sign-in");

  const rawQuery = (await searchParams)?.q;
  const initialQuery = Array.isArray(rawQuery) ? rawQuery[0] ?? "" : rawQuery ?? "";

  return (
    <div className="bookgolas-consumer-page min-h-screen bg-[var(--blab-surface-scaffold)] text-[var(--blab-text-primary)]">
      <ConsumerHeader locale={locale as ConsumerLocale} authenticated />
      <BookDiscoveryClient locale={locale as ConsumerLocale} initialQuery={initialQuery} />
    </div>
  );
}
