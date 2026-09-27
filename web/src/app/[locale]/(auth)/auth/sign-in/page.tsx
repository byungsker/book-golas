import { redirect } from "next/navigation";
import { AuthForm } from "@/components/consumer/auth-form";
import { getSafeNextPath } from "@/lib/consumer/paths";
import { getOAuthCallbackErrorKey } from "@/lib/consumer/oauth";

type SignInPageProps = {
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
