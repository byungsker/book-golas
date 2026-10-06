import { notFound, redirect } from "next/navigation";
import { getCurrentConsumerUser } from "@/shared/auth/index.server";
import { getConsumerPath, isConsumerLocale } from "@/shared/routing";
import ConsumerLandingPage from "./ui/ConsumerLandingPage";

export default async function ConsumerLandingRoutePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isConsumerLocale(locale)) notFound();

  const { user } = await getCurrentConsumerUser();
  if (user) redirect(getConsumerPath(locale, "/home"));

  return <ConsumerLandingPage />;
}
