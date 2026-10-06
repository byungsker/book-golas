import { redirect } from "next/navigation";
import { AuthForm, getOAuthCallbackErrorKey } from "@/features/auth";
import { getSafeNextPath } from "@/shared/routing";

export type SignInPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    next?: string | string[];
    returnTo?: string | string[];
    error?: string | string[];
  }>;
};

export default async function SignInPage({
  params,
  searchParams,
}: SignInPageProps) {
  const { locale } = await params;
  if (locale !== "ko" && locale !== "en") redirect("/ko/auth/sign-in");

  const query = await searchParams;
  const rawCandidate = query.returnTo ?? query.next;
  const candidate = Array.isArray(rawCandidate) ? rawCandidate[0] : rawCandidate;
  const rawError = query.error;
  const error = Array.isArray(rawError) ? rawError[0] : rawError;

  return (
    <AuthForm
      mode="sign-in"
      locale={locale}
      nextPath={getSafeNextPath(locale, candidate)}
      initialErrorKey={getOAuthCallbackErrorKey(error)}
    />
  );
}
