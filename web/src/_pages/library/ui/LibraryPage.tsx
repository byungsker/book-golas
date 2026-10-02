import { redirect } from "next/navigation";
import type { ConsumerLocale } from "@/shared/routing";
import { isConsumerLocale } from "@/shared/routing";
import { getLibraryTab } from "../model/library";
import { LibraryView } from "./LibraryView";

export default async function LibraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ tab?: string | string[]; view?: string | string[]; mode?: string | string[] }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isConsumerLocale(rawLocale)) redirect("/ko/auth/sign-in");

  const locale: ConsumerLocale = rawLocale;
  const query = await searchParams;
  const mode = Array.isArray(query?.mode) ? query?.mode[0] : query?.mode;
  const view = Array.isArray(query?.view) ? query?.view[0] : query?.view;
  const tab = Array.isArray(query?.tab) ? query?.tab[0] : query?.tab;

  return (
    <LibraryView
      locale={locale}
      initialTab={getLibraryTab(tab ?? (view === "records" ? "records" : undefined))}
      initialRecall={mode === "recall"}
    />
  );
}
