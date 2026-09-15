import { LibraryClient } from "@/components/consumer/library-client";
import type { ConsumerLocale } from "@/lib/consumer/paths";
import { getLibraryTab } from "@/lib/consumer/library";

export default async function LibraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: ConsumerLocale }>;
  searchParams?: Promise<{ tab?: string | string[]; view?: string | string[]; mode?: string | string[] }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const mode = Array.isArray(query?.mode) ? query?.mode[0] : query?.mode;
  const view = Array.isArray(query?.view) ? query?.view[0] : query?.view;
  const tab = Array.isArray(query?.tab) ? query?.tab[0] : query?.tab;
  return <LibraryClient locale={locale} initialTab={getLibraryTab(tab ?? (view === "records" ? "records" : undefined))} initialRecall={mode === "recall"} />;
}
