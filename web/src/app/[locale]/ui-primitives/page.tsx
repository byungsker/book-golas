import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UiPrimitivesShowcase } from "@/components/consumer/ui-primitives-showcase";
import { isConsumerLocale } from "@/lib/consumer/paths";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isConsumerLocale(locale)) notFound();

  const t = await getTranslations({ locale, namespace: "consumer.uiPrimitives" });
  return { title: t("title") };
}

export default async function UiPrimitivesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isConsumerLocale(locale)) notFound();

  return <UiPrimitivesShowcase />;
}
