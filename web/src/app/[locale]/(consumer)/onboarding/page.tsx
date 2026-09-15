import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/consumer/onboarding-flow";
import { getSafeNextPath, isConsumerLocale } from "@/lib/consumer/paths";

export default async function OnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { locale } = await params;
  if (!isConsumerLocale(locale)) redirect("/ko/auth/sign-in");

  const query = await searchParams;
  const rawNext = query.next;
  const next = Array.isArray(rawNext) ? rawNext[0] : rawNext;

  return <OnboardingFlow nextPath={getSafeNextPath(locale, next)} />;
}
