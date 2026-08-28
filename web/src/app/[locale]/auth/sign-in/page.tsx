import { redirect } from "next/navigation";
import { AuthForm } from "@/components/consumer/auth-form";
import { getSafeNextPath } from "@/lib/consumer/paths";

type SignInPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function SignInPage({
  params,
  searchParams,
}: SignInPageProps) {
  const { locale } = await params;
  if (locale !== "ko" && locale !== "en") redirect("/ko/auth/sign-in");

  const query = await searchParams;
  const candidate = Array.isArray(query.next) ? query.next[0] : query.next;

  return (
    <AuthForm
      mode="sign-in"
      locale={locale}
      nextPath={getSafeNextPath(locale, candidate)}
    />
  );
}
