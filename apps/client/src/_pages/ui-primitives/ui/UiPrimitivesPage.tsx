import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isConsumerLocale } from "@/shared/routing";
import { UiPrimitivesShowcase } from "./UiPrimitivesShowcase";

export type UiPrimitivesPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: UiPrimitivesPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isConsumerLocale(locale)) notFound();

  const t = await getTranslations({ locale, namespace: "consumer.uiPrimitives" });
  return { title: t("title") };
}

export default async function UiPrimitivesPage({
  params,
}: UiPrimitivesPageProps) {
  const { locale } = await params;
  if (!isConsumerLocale(locale)) notFound();

  return <UiPrimitivesShowcase />;
}
