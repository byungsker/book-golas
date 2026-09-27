import { redirect } from "next/navigation";
import { BookDiscoveryClient } from "@/components/consumer/book-discovery-client";
import { ConsumerHeader } from "@/components/consumer/consumer-header";
import type { ConsumerLocale } from "@/lib/consumer/paths";
import { isConsumerLocale } from "@/lib/consumer/paths";

export const dynamic = "force-dynamic";

export default async function NewBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ q?: string | string[] }>;
}) {
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
