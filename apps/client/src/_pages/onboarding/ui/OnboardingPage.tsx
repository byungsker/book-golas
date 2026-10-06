import { redirect } from "next/navigation";
import { getSafeNextPath, isConsumerLocale } from "@/shared/routing";
import { OnboardingFlow } from "./OnboardingFlow";

export type OnboardingPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function OnboardingPage({
  params,
  searchParams,
}: OnboardingPageProps) {
  const { locale } = await params;
  if (!isConsumerLocale(locale)) redirect("/ko/auth/sign-in");

  const query = await searchParams;
  const rawNext = query.next;
  const next = Array.isArray(rawNext) ? rawNext[0] : rawNext;

  return <OnboardingFlow nextPath={getSafeNextPath(locale, next)} />;
}
