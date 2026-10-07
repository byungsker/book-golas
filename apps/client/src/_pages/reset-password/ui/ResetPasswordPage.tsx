import { redirect } from "next/navigation";
import { AuthForm } from "@/features/auth";
import { getConsumerPath } from "@/shared/routing";

export type ResetPasswordPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ResetPasswordPage({
  params,
}: ResetPasswordPageProps) {
  const { locale } = await params;
  if (locale !== "ko" && locale !== "en") redirect("/ko/auth/reset-password");

  return (
    <AuthForm
      mode="reset-password"
      locale={locale}
      nextPath={getConsumerPath(locale, "/home")}
    />
  );
}
