import { redirect } from "next/navigation";
import { AuthForm, getOAuthCallbackErrorKey } from "@/features/auth";
import { getSafeNextPath } from "@/shared/routing";

export type SignInPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
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
  const rawCandidate = query.returnTo;
  const candidate = Array.isArray(rawCandidate) ? undefined : rawCandidate;
  const rawError = query.error;
  const error = Array.isArray(rawError) ? undefined : rawError;

  return (
    <AuthForm
      mode="sign-in"
      locale={locale}
      nextPath={getSafeNextPath(locale, candidate)}
      initialErrorKey={getOAuthCallbackErrorKey(error)}
    />
  );
}
