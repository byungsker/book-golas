import { redirect } from "next/navigation";
import { AuthForm } from "@/features/auth";
import { getConsumerPath } from "@/shared/routing";

export type SignUpPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function SignUpPage({ params }: SignUpPageProps) {
  const { locale } = await params;
  if (locale !== "ko" && locale !== "en") redirect("/ko/auth/sign-up");

  return (
    <AuthForm
      mode="sign-up"
      locale={locale}
      nextPath={getConsumerPath(locale, "/home")}
    />
  );
}
